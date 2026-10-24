import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';
import { ZodError } from 'zod';
import { config } from './config.js';
import { idSchema, loanSchema, requestOtpSchema, todayIn, verifyOtpSchema } from './validation.js';

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const hashOtp = (phone: string, otp: string) =>
  createHmac('sha256', config.OTP_SECRET).update(`${phone}:${otp}`).digest('hex');

const entryColumns = `id, friend_name AS "friendName", amount::text, due_date::text AS "dueDate",
  note, repaid_at AS "repaidAt", created_at AS "createdAt", (receipt IS NOT NULL) AS "hasReceipt"`;

export function createApp(db: Pool, log: (line: string) => void = console.log) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGINS.split(',').map((value) => value.trim()) }));
  app.use(express.json({ limit: '32kb' }));
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Too many requests. Try again in a minute.' },
    }),
  );
  const otpLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many OTP requests. Try again in 15 minutes.' },
  });
  const verifyLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 40,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many verification attempts. Try again in 15 minutes.' },
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 4 },
  });

  app.get('/health', async (_req, res) => {
    await db.query('SELECT 1');
    res.json({ status: 'ok' });
  });

  app.post('/api/auth/request-otp', otpLimiter, async (req, res) => {
    const { phone } = requestOtpSchema.parse(req.body);
    const otp = String(randomInt(100000, 1000000));
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      // Serialize resends even when this phone has no challenge row yet.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [phone]);
      const recent = await client.query(
        "SELECT 1 FROM otp_challenges WHERE phone=$1 AND sent_at > now() - interval '30 seconds'",
        [phone],
      );
      if (recent.rowCount)
        throw new HttpError(429, 'Wait 30 seconds before requesting another OTP.');
      await client.query(
        `INSERT INTO otp_challenges(phone, code_hash, expires_at) VALUES ($1,$2,now()+interval '5 minutes')
        ON CONFLICT(phone) DO UPDATE SET code_hash=$2, expires_at=now()+interval '5 minutes', sent_at=now(), attempts=0`,
        [phone, hashOtp(phone, otp)],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    log(`[Mock OTP] ${phone}: ${otp} (valid for 5 minutes)`);
    res.json({ message: 'OTP printed in the server log.', expiresIn: 300, retryAfter: 30 });
  });

  app.post('/api/auth/verify-otp', verifyLimiter, async (req, res) => {
    const { phone, otp } = verifyOtpSchema.parse(req.body);
    const token = randomBytes(32).toString('hex');
    const client = await db.connect();
    let user;
    let committed = false;
    try {
      await client.query('BEGIN');
      const result = await client.query(
        'SELECT *, expires_at > now() AS valid FROM otp_challenges WHERE phone=$1 FOR UPDATE',
        [phone],
      );
      const challenge = result.rows[0];
      if (!challenge || !challenge.valid || challenge.attempts >= 5)
        throw new HttpError(400, 'OTP expired or unavailable. Request a new code.');
      const matches = timingSafeEqual(
        Buffer.from(challenge.code_hash, 'hex'),
        Buffer.from(hashOtp(phone, otp), 'hex'),
      );
      if (!matches) {
        await client.query('UPDATE otp_challenges SET attempts=attempts+1 WHERE phone=$1', [phone]);
        // Commit failed attempts so retries cannot bypass the five-attempt limit.
        await client.query('COMMIT');
        committed = true;
        throw new HttpError(400, 'Incorrect OTP. Check the server log and try again.');
      }
      await client.query('DELETE FROM otp_challenges WHERE phone=$1', [phone]);
      const users = await client.query(
        `INSERT INTO users(phone) VALUES ($1) ON CONFLICT(phone) DO UPDATE SET phone=$1 RETURNING id, phone`,
        [phone],
      );
      user = users.rows[0];
      await client.query(
        `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '7 days')`,
        [hashToken(token), user.id],
      );
      await client.query('COMMIT');
    } catch (error) {
      if (!committed) await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    res.json({ token, user });
  });

  app.use('/api', async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ') || !/^[a-f0-9]{64}$/.test(header.slice(7)))
      throw new HttpError(401, 'Please sign in to continue.');
    const tokenHash = hashToken(header.slice(7));
    const result = await db.query(
      `SELECT u.id, u.phone FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at > now()`,
      [tokenHash],
    );
    if (!result.rowCount)
      throw new HttpError(401, 'Your session has expired. Please sign in again.');
    res.locals.user = result.rows[0];
    res.locals.tokenHash = tokenHash;
    next();
  });

  app.get('/api/auth/me', (_req, res) => {
    res.json({ user: res.locals.user });
  });
  app.post('/api/auth/logout', async (_req, res) => {
    await db.query('DELETE FROM sessions WHERE token_hash=$1', [res.locals.tokenHash]);
    res.status(204).end();
  });

  app.get('/api/entries', async (_req, res) => {
    const today = todayIn(config.APP_TIMEZONE);
    const result = await db.query(
      `SELECT ${entryColumns}, (repaid_at IS NULL AND due_date < $2::date) AS "isOverdue"
      FROM loan_entries WHERE user_id=$1 ORDER BY (repaid_at IS NOT NULL), due_date, created_at DESC`,
      [res.locals.user.id, today],
    );
    res.json({ entries: result.rows, today, timeZone: config.APP_TIMEZONE });
  });

  app.post('/api/entries', upload.single('receipt'), async (req, res) => {
    const data = loanSchema.parse(req.body);
    let mime: string | null = null;
    if (req.file) {
      const type = await fileTypeFromBuffer(req.file.buffer);
      if (!type || !['image/jpeg', 'image/png', 'image/webp'].includes(type.mime))
        throw new HttpError(400, 'Receipt must be a JPEG, PNG, or WebP image.');
      mime = type.mime;
    }
    const result = await db.query(
      `INSERT INTO loan_entries(user_id,friend_name,amount,due_date,note,receipt,receipt_mime)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${entryColumns}, (due_date < $8::date) AS "isOverdue"`,
      [
        res.locals.user.id,
        data.friendName,
        data.amount,
        data.dueDate,
        data.note,
        req.file?.buffer ?? null,
        mime,
        todayIn(config.APP_TIMEZONE),
      ],
    );
    res.status(201).json({ entry: result.rows[0] });
  });

  app.patch('/api/entries/:id/repay', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    // COALESCE makes a repeat request safe and preserves the original repayment time.
    const result = await db.query(
      `UPDATE loan_entries SET repaid_at=COALESCE(repaid_at,now()) WHERE id=$1 AND user_id=$2
      RETURNING ${entryColumns}, false AS "isOverdue"`,
      [id, res.locals.user.id],
    );
    if (!result.rowCount) throw new HttpError(404, 'Entry not found.');
    res.json({ entry: result.rows[0] });
  });

  app.get('/api/entries/:id/receipt', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const result = await db.query(
      'SELECT receipt,receipt_mime FROM loan_entries WHERE id=$1 AND user_id=$2 AND receipt IS NOT NULL',
      [id, res.locals.user.id],
    );
    if (!result.rowCount) throw new HttpError(404, 'Receipt not found.');
    const row = result.rows[0];
    res.setHeader('Cache-Control', 'no-store');
    res.json({ dataUri: `data:${row.receipt_mime};base64,${row.receipt.toString('base64')}` });
  });

  app.get('/api/summary', async (_req, res) => {
    const today = todayIn(config.APP_TIMEZONE);
    const result = await db.query(
      `SELECT
      COALESCE(SUM(amount),0)::text AS "totalLent",
      COALESCE(SUM(amount) FILTER (WHERE repaid_at IS NOT NULL),0)::text AS "totalRepaid",
      COALESCE(SUM(amount) FILTER (WHERE repaid_at IS NULL),0)::text AS "outstanding",
      COALESCE(SUM(amount) FILTER (WHERE repaid_at IS NULL AND due_date < $2::date),0)::text AS "overdueAmount",
      COUNT(*)::int AS "entryCount",
      COUNT(*) FILTER (WHERE repaid_at IS NULL)::int AS "pendingCount",
      COUNT(*) FILTER (WHERE repaid_at IS NULL AND due_date < $2::date)::int AS "overdueCount"
      FROM loan_entries WHERE user_id=$1`,
      [res.locals.user.id, today],
    );
    res.json({ ...result.rows[0], today, timeZone: config.APP_TIMEZONE });
  });

  app.use((_req, _res, next) => next(new HttpError(404, 'Endpoint not found.')));
  const onError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ZodError) {
      res
        .status(400)
        .json({
          error: error.issues[0]?.message ?? 'Invalid input.',
          fields: error.flatten().fieldErrors,
        });
    } else if (error instanceof multer.MulterError) {
      res
        .status(400)
        .json({
          error:
            error.code === 'LIMIT_FILE_SIZE'
              ? 'Receipt must be smaller than 5 MB.'
              : 'Invalid upload. Attach one receipt image.',
        });
    } else if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
    } else if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({ error: 'Invalid JSON request.' });
    } else {
      console.error(error);
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  };
  app.use(onError);
  return app;
}
