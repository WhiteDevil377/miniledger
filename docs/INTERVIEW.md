# Understand your MiniLedger

Start with the three screens in `apps/mobile/src/app`, then follow their requests into `apps/api/src/app.ts`. Keep the README's API table beside you.

## Explain the architecture in a minute

“The React Native app has a login screen, a ledger screen, and an add-entry screen. Expo Router handles screen navigation. A small authentication context holds the current user and session token. The app calls an Express API, which validates inputs, checks the session, and runs parameterized SQL against PostgreSQL. PostgreSQL stores users, OTP challenges, sessions, and loan entries.”

## Follow one login

1. The app sends an international-format phone number to `request-otp`.
2. The server generates a random six-digit code with Node's crypto module. It prints the code and stores a keyed hash with an expiry and attempt counter.
3. The app sends the phone and typed code to `verify-otp`.
4. The API locks that phone's challenge row inside a transaction, checks expiry and attempts, and compares hashes.
5. A correct code consumes the challenge, creates or finds the user, and creates a session. These writes commit together.
6. The raw session token is returned once. PostgreSQL stores only its SHA-256 hash. Native storage uses SecureStore.
7. Later requests send the token in an Authorization header. Middleware hashes it and finds the matching unexpired session.

**Why a transaction and row lock?** Two nearly simultaneous verification requests should not both use the same OTP. The second waits for the first; once the first consumes the code, the second cannot log in.

**Why HMAC for the OTP?** Six-digit codes have a small search space. A secret-keyed hash makes a leaked database alone less useful for guessing codes. The secret is separate from the database.

**Why no JWT?** A small app can use opaque database-backed tokens. Revoking a session is one database delete. JWTs would add signing and revocation tradeoffs without a requirement for stateless authentication.

## Follow one loan

The form checks the name, positive decimal amount, and real calendar date. It builds FormData, optionally including an image URI. The API validates again because a client can bypass form checks. Multer enforces the upload size limit, and `file-type` checks the file signature. The insert uses the user ID from the session, not an ID supplied by the client. The app reloads the list and summary when the ledger screen regains focus.

**Why validate twice?** Client validation gives quick feedback. Server validation protects the stored data regardless of which client sends the request.

**Why parameterized SQL?** Input is supplied separately from the SQL text, so a friend's name cannot turn into executable SQL. It also keeps the data flow easy to read.

**Why PostgreSQL NUMERIC?** Decimal money totals should be exact. Binary floating-point arithmetic can give surprising results such as `0.1 + 0.2`. PostgreSQL performs the sums; API money fields remain strings until display formatting.

**Why a DATE column?** A due date describes a calendar day, not an instant such as 10:35 AM. The API computes today's day in the configured time zone and compares dates directly. Entries due today are not overdue.

## Follow one repayment

The API updates only an entry whose ID and owner both match. `COALESCE(repaid_at, now())` keeps the existing time if the loan is already repaid. This makes repeated requests idempotent. Summary totals are derived from entries rather than stored in another table, so there is no second set of totals to keep synchronized.

**Can one user repay another user's loan?** The update includes `WHERE id = ... AND user_id = ...`. A request for another user's entry returns 404 and changes nothing. Receipt reads use the same ownership rule.

## What the tests prove

The tests call the real Express app through Supertest and use a real PostgreSQL database in a temporary schema. They exercise database constraints, transactions, ownership checks, uploads, and aggregation together. The schema is deleted afterward; application data is untouched.

Be ready to demonstrate the due-today test, the concurrent OTP test, and the second-account isolation test. Explain what a failing version of each would allow.

## Choices to discuss honestly

- This is mock OTP login. It does not send SMS or prove ownership of a real phone number.
- Repayment is all or nothing. Partial repayments would need a separate payments table and a balance calculation.
- The app uses one currency, INR. Multiple currencies must not be summed without an explicit conversion rule.
- Receipts are small database blobs. Object storage would scale better for many files, with a separate authorization strategy.
- IP rate limiting is in one server's memory. Multiple servers would need a shared store such as Redis.
- The loan list is suitable for a small assignment. A large ledger would need pagination, and likely indexed search.
- The browser preview shares React Native screens, but it does not prove native permissions or secure storage work on every phone. Test your target device before recording.

## Practice without reading

1. Draw the four database tables and their relationships.
2. Explain why deleting an OTP and creating a session belong in one transaction.
3. Show where a user ID comes from and why it cannot be trusted from a form.
4. Explain why repaying an overdue loan reduces both outstanding and overdue amounts.
5. Add a small validation rule yourself, then run the tests and explain the result.

If asked about AI assistance, describe it directly: AI helped scaffold and review the implementation; you reviewed the code, ran the checks, and can walk through these flows. Only claim the parts you have personally understood and verified.
