import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

export const config = z
  .object({
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1),
    OTP_SECRET: z.string().min(32),
    APP_TIMEZONE: z
      .string()
      .default('Asia/Kolkata')
      .refine((value) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, 'Invalid IANA time zone'),
    CORS_ORIGINS: z.string().default('http://localhost:8081'),
  })
  .parse(process.env);
