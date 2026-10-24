import { z } from 'zod';

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, 'Use an international phone number, e.g. +919876543210.');
export const requestOtpSchema = z.object({ phone: phoneSchema });
export const verifyOtpSchema = requestOtpSchema.extend({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit OTP.'),
});
export const idSchema = z.uuid();
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value &&
      value >= '2000-01-01' &&
      value <= '2100-12-31'
    );
  }, 'Enter a real date between 2000 and 2100.');
export const loanSchema = z.object({
  friendName: z.string().trim().min(2, 'Enter at least 2 characters.').max(80),
  amount: z
    .union([z.string(), z.number()])
    .transform(String)
    .pipe(
      z
        .string()
        .regex(/^\d{1,9}(\.\d{1,2})?$/, 'Use a positive amount with up to 2 decimal places.'),
    )
    .refine(
      (value) => Number(value) > 0 && Number(value) <= 999999999.99,
      'Amount must be between 0.01 and 999,999,999.99.',
    )
    .transform((value) => Number(value).toFixed(2)),
  dueDate: dateSchema,
  note: z.string().trim().max(240).default(''),
});

export function todayIn(timeZone: string, now = new Date()) {
  // ISO dates compare safely as strings. Calendar days avoid midnight/time-zone errors.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
