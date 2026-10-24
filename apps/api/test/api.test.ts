import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { createApp, hashToken } from '../src/app.js';
import { config } from '../src/config.js';
import { schema, pool as unusedPool } from '../src/db.js';
import { todayIn } from '../src/validation.js';

const testSchema = `test_${randomUUID().replaceAll('-', '')}`;
const connectionString = process.env.TEST_DATABASE_URL || config.DATABASE_URL;
const admin = new Pool({ connectionString });
const db = new Pool({ connectionString, options: `-c search_path=${testSchema},public` });
const codes = new Map<string, string>();
const app = createApp(db, (line) => {
  const match = line.match(/(\+\d+): (\d{6})/);
  if (match) codes.set(match[1], match[2]);
});
const phone = '+919876543210';
let token: string;
let otherToken: string;
let pastId: string;
let receiptId: string;
const today = todayIn(config.APP_TIMEZONE);
function shifted(days: number) {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
const validLoan = {
  friendName: 'Priya Patel',
  amount: '100.10',
  dueDate: shifted(1),
  note: 'Concert tickets',
};
// A complete 1×1 PNG; MIME headers alone must never decide the stored file type.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  'base64',
);
const authorized = (method: 'get' | 'post' | 'patch', path: string, value = token) =>
  request(app)[method](path).set('Authorization', `Bearer ${value}`);

before(async () => {
  await admin.query(`CREATE SCHEMA ${testSchema}`);
  await db.query(schema);
});
after(async () => {
  await db.end();
  await admin.query(`DROP SCHEMA ${testSchema} CASCADE`);
  await admin.end();
  await unusedPool.end();
});

describe('Phone login and session security', () => {
  it('checks database health', async () => {
    await request(app).get('/health').expect(200, { status: 'ok' });
  });
  it('validates international phone numbers', async () => {
    await request(app).post('/api/auth/request-otp').send({ phone: '123' }).expect(400);
  });
  it('prints a mock OTP without returning the code and enforces resend cooldown', async () => {
    const response = await request(app).post('/api/auth/request-otp').send({ phone }).expect(200);
    assert.equal(response.body.otp, undefined);
    assert.match(codes.get(phone)!, /^\d{6}$/);
    await request(app).post('/api/auth/request-otp').send({ phone }).expect(429);
  });
  it('counts an incorrect code, logs in with the correct code, and prevents replay', async () => {
    await request(app).post('/api/auth/verify-otp').send({ phone, otp: '000000' }).expect(400);
    assert.equal(
      (await db.query('SELECT attempts FROM otp_challenges WHERE phone=$1', [phone])).rows[0]
        .attempts,
      1,
    );
    const result = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone, otp: codes.get(phone) })
      .expect(200);
    token = result.body.token;
    assert.match(token, /^[a-f0-9]{64}$/);
    const saved = await db.query('SELECT token_hash FROM sessions');
    assert.equal(saved.rows[0].token_hash, hashToken(token));
    assert.notEqual(saved.rows[0].token_hash, token);
    await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone, otp: codes.get(phone) })
      .expect(400);
  });
  it('creates an independent second account', async () => {
    const second = '+919876543211';
    await request(app).post('/api/auth/request-otp').send({ phone: second }).expect(200);
    const result = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: second, otp: codes.get(second) })
      .expect(200);
    otherToken = result.body.token;
  });
  it('rejects missing and invalid sessions', async () => {
    await request(app).get('/api/entries').expect(401);
    await authorized('get', '/api/summary', 'a'.repeat(64)).expect(401);
  });
  it('rejects expired OTPs', async () => {
    const number = '+919876543212';
    await request(app).post('/api/auth/request-otp').send({ phone: number }).expect(200);
    await db.query(
      "UPDATE otp_challenges SET expires_at=now()-interval '1 second' WHERE phone=$1",
      [number],
    );
    await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: number, otp: codes.get(number) })
      .expect(400);
  });
  it('blocks a correct OTP after five failed attempts', async () => {
    const number = '+919876543213';
    await request(app).post('/api/auth/request-otp').send({ phone: number }).expect(200);
    for (let i = 0; i < 5; i++)
      await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: number, otp: '000000' })
        .expect(400);
    await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: number, otp: codes.get(number) })
      .expect(400);
  });
  it('allows only one concurrent verification to consume an OTP', async () => {
    const number = '+919876543214';
    await request(app).post('/api/auth/request-otp').send({ phone: number }).expect(200);
    const responses = await Promise.all(
      [1, 2].map(() =>
        request(app)
          .post('/api/auth/verify-otp')
          .send({ phone: number, otp: codes.get(number) }),
      ),
    );
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 400]);
  });
});

describe('Loan entries, decimal amounts, and calendar dates', () => {
  it('returns zero totals for an empty ledger', async () => {
    const response = await authorized('get', '/api/summary').expect(200);
    assert.equal(Number(response.body.totalLent), 0);
    assert.equal(response.body.entryCount, 0);
  });
  it('rejects invalid money, impossible dates, missing names, and overlong notes', async () => {
    for (const change of [
      { amount: '-10' },
      { amount: '0' },
      { amount: '1.001' },
      { amount: '1000000000' },
      { friendName: ' ' },
      { dueDate: '2026-02-30' },
      { note: 'a'.repeat(241) },
    ]) {
      await authorized('post', '/api/entries')
        .send({ ...validLoan, ...change })
        .expect(400);
    }
  });
  it('creates future, overdue, and due-today loans', async () => {
    const future = await authorized('post', '/api/entries').send(validLoan).expect(201);
    assert.equal(future.body.entry.amount, '100.10');
    assert.equal(future.body.entry.isOverdue, false);
    const past = await authorized('post', '/api/entries')
      .send({ ...validLoan, amount: '250.25', dueDate: shifted(-1) })
      .expect(201);
    pastId = past.body.entry.id;
    assert.equal(past.body.entry.isOverdue, true);
    const dueToday = await authorized('post', '/api/entries')
      .send({ ...validLoan, amount: '50', dueDate: today })
      .expect(201);
    assert.equal(dueToday.body.entry.isOverdue, false);
  });
  it('adds a receipt with multipart fields and reads it through authentication', async () => {
    const response = await authorized('post', '/api/entries')
      .field('friendName', 'Aarav Sharma')
      .field('amount', '99.99')
      .field('dueDate', shifted(2))
      .attach('receipt', png, { filename: 'receipt.png', contentType: 'image/png' })
      .expect(201);
    receiptId = response.body.entry.id;
    assert.equal(response.body.entry.hasReceipt, true);
    const receipt = await authorized('get', `/api/entries/${receiptId}/receipt`).expect(200);
    assert.equal(receipt.body.dataUri, `data:image/png;base64,${png.toString('base64')}`);
  });
  it('rejects a fake image and an oversized upload without creating an entry', async () => {
    const count = (await authorized('get', '/api/summary')).body.entryCount;
    await authorized('post', '/api/entries')
      .field('friendName', 'Fake Receipt')
      .field('amount', '10')
      .field('dueDate', today)
      .attach('receipt', Buffer.from('not an image'), {
        filename: 'fake.png',
        contentType: 'image/png',
      })
      .expect(400);
    await authorized('post', '/api/entries')
      .field('friendName', 'Large Receipt')
      .field('amount', '10')
      .field('dueDate', today)
      .attach('receipt', Buffer.alloc(5 * 1024 * 1024 + 1), 'large.png')
      .expect(400);
    assert.equal((await authorized('get', '/api/summary')).body.entryCount, count);
  });
  it('calculates exact totals and excludes due-today loans from overdue', async () => {
    const response = await authorized('get', '/api/summary').expect(200);
    assert.equal(response.body.totalLent, '500.34');
    assert.equal(response.body.overdueAmount, '250.25');
    assert.equal(response.body.pendingCount, 4);
    assert.equal(response.body.overdueCount, 1);
    const list = await authorized('get', '/api/entries').expect(200);
    assert.equal(list.body.entries[0].id, pastId);
    assert.equal(list.body.entries[0].isOverdue, true);
  });
  it('keeps entries, totals, repayments, and receipts isolated by account', async () => {
    const summary = await authorized('get', '/api/summary', otherToken).expect(200);
    assert.equal(summary.body.entryCount, 0);
    assert.deepEqual((await authorized('get', '/api/entries', otherToken)).body.entries, []);
    await authorized('patch', `/api/entries/${pastId}/repay`, otherToken).expect(404);
    await authorized('get', `/api/entries/${receiptId}/receipt`, otherToken).expect(404);
  });
  it('marks a loan repaid and preserves its repayment time on repeat requests', async () => {
    const first = await authorized('patch', `/api/entries/${pastId}/repay`).expect(200);
    const second = await authorized('patch', `/api/entries/${pastId}/repay`).expect(200);
    assert.equal(second.body.entry.repaidAt, first.body.entry.repaidAt);
    assert.equal(second.body.entry.isOverdue, false);
    const summary = (await authorized('get', '/api/summary')).body;
    assert.equal(summary.totalLent, '500.34');
    assert.equal(summary.totalRepaid, '250.25');
    assert.equal(summary.outstanding, '250.09');
    assert.equal(Number(summary.overdueAmount), 0);
  });
  it('validates entry IDs and handles nonexistent entries', async () => {
    await authorized('patch', '/api/entries/not-a-uuid/repay').expect(400);
    await authorized('patch', `/api/entries/${randomUUID()}/repay`).expect(404);
  });
  it('revokes a session when the user signs out', async () => {
    await authorized('post', '/api/auth/logout').expect(204);
    await authorized('get', '/api/auth/me').expect(401);
  });
});

describe('Time-zone boundary', () => {
  it('uses the configured calendar day near midnight', () => {
    assert.equal(todayIn('Asia/Kolkata', new Date('2026-10-23T20:00:00Z')), '2026-10-24');
    assert.equal(todayIn('UTC', new Date('2026-10-23T20:00:00Z')), '2026-10-23');
  });
});
