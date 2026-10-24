import { Pool } from 'pg';
import { config } from './config.js';

export const pool = new Pool({ connectionString: config.DATABASE_URL });

export const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(16) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS otp_challenges (
    phone VARCHAR(16) PRIMARY KEY,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    attempts INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
  );
  CREATE TABLE IF NOT EXISTS loan_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_name VARCHAR(80) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0 AND amount <= 999999999.99),
    due_date DATE NOT NULL,
    note VARCHAR(240) NOT NULL DEFAULT '',
    repaid_at TIMESTAMPTZ,
    receipt BYTEA,
    receipt_mime TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((receipt IS NULL) = (receipt_mime IS NULL))
  );
  CREATE INDEX IF NOT EXISTS entries_user_due ON loan_entries(user_id, due_date);
  CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
`;

export async function migrate() {
  // One small, idempotent initial schema; use numbered migrations as the app grows.
  await pool.query(schema);
}
