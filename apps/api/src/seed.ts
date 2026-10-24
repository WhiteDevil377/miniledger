import { pool } from './db.js';
import { config } from './config.js';
import { phoneSchema, todayIn } from './validation.js';

const phone = phoneSchema.parse(process.argv[2] ?? '+919876543210');
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const user = await client.query(
    'INSERT INTO users(phone) VALUES ($1) ON CONFLICT(phone) DO UPDATE SET phone=$1 RETURNING id',
    [phone],
  );
  const userId = user.rows[0].id;
  const existing = await client.query('SELECT 1 FROM loan_entries WHERE user_id=$1 LIMIT 1', [
    userId,
  ]);
  if (existing.rowCount)
    console.log('This user already has entries. Seed skipped to preserve existing data.');
  else {
    const today = todayIn(config.APP_TIMEZONE);
    const entries = [
      ['Aarav Sharma', '2500.00', -3, 'Weekend getaway', false],
      ['Priya Patel', '1800.00', 4, 'Concert tickets', false],
      ['Rohan Mehta', '3500.00', 7, 'A little help with rent', false],
      ['Ananya Singh', '1200.00', -5, 'Dinner at our favourite place', true],
      ['Kabir Kapoor', '450.00', 2, 'Coffee & catch-up', false],
    ];
    for (const [name, amount, days, note, repaid] of entries) {
      await client.query(
        `INSERT INTO loan_entries(user_id,friend_name,amount,due_date,note,repaid_at)
        VALUES ($1,$2,$3,$4::date+$5::int,$6,CASE WHEN $7 THEN now() ELSE NULL END)`,
        [userId, name, amount, today, days, note, repaid],
      );
    }
    console.log(
      `Added five sample loans for ${phone}. Sign in with a new OTP from the server log.`,
    );
  }
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
