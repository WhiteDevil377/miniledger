# MiniLedger recording walkthrough — about 2 minutes 30 seconds

A silent recording of the working browser preview is available locally as `docs/miniledger-browser-demo.mp4`. It demonstrates OTP verification, summary totals, validation, adding an overdue loan, searching, repayment, filters, and persistence after refresh. It includes captions and can be uploaded to Loom or Google Drive. It is a browser demonstration of the React Native screens; it does not show a physical phone.

To make your own version, record the app on a phone with its built-in screen recorder, or record the React Native browser preview with Loom. A phone recording best demonstrates the requested mobile app. Use sample data, not real friends' phone numbers or financial records.

Before recording, start PostgreSQL, run the migration and optional seed, and start both the API and app as described in the README. Keep the API terminal ready to read the mock OTP. Use `9876543210` for the seeded account. Have a small receipt photo available for the bonus feature.

| Time | Show | Suggested explanation |
| --- | --- | --- |
| 0:00–0:15 | Login screen | “MiniLedger tracks the money I lend to friends. The mobile app uses React Native and Expo, and the backend uses Node.js, TypeScript, and PostgreSQL.” |
| 0:15–0:35 | Request OTP; briefly show the API log; enter the code | “This is a mock OTP flow. The server prints a random code, which expires after five minutes. Successful verification creates a session.” |
| 0:35–0:55 | Summary and sample list | “The top card shows all money lent, money repaid, and the outstanding balance. This orange entry is overdue. A loan due today is still pending.” |
| 0:55–1:25 | Add a loan | Enter “Neha Verma”, amount “750”, a future date, and “Lunch & movie”. Attach a small receipt photo and save. “The form validates the name, amount, and calendar date. A receipt is optional.” |
| 1:25–1:45 | Updated summary and the new entry | “The entry is saved in PostgreSQL and the totals update. I can search for Neha and open the attached receipt.” |
| 1:45–2:10 | Mark the new entry as repaid; confirm | “Repayment updates the record and the summary. Repeating the request is safe: the server preserves the first repayment time.” |
| 2:10–2:25 | Repaid filter, then overdue filter | “Filters separate pending and repaid loans. Tapping the overdue card shows just the overdue entries.” |
| 2:25–2:40 | Refresh/reopen, then sign out | “Data persists across refreshes. Each session can access only its user's entries and receipts. The repository includes integration tests and setup instructions.” |

If you prefer a shorter recording, omit the separate receipt explanation. Keep the core sequence: login → summary → add → overdue highlight → repay → updated totals.

After recording, upload the file to Google Drive or Loom and check that the reviewer can view it without requesting access. Do not include `.env` files or secret values in the recording. The mock OTP itself is intended to be shown for this demo.
