# Verification record

Checked locally on 24 October 2026 with a real PostgreSQL 18 database.

| Check | Result |
| --- | --- |
| Backend integration tests | 20 passed, 0 failed |
| TypeScript, API and app | Passed |
| ESLint, API and app | Passed |
| Compiled backend | Passed |
| Expo Doctor | 21 of 21 checks passed |
| Fresh install from lockfile with Node 24 | Passed; one compatible version of each native module |
| Production JavaScript export | Android, iOS, and web bundles generated |
| Browser preview: phone login | Passed using the OTP printed in the API log |
| Browser preview: required form fields | Validation messages shown |
| Browser preview: add loan | New ₹750 entry saved; totals increased |
| Browser preview: search | Found the new entry by name |
| Browser preview: repay | Confirmation succeeded; outstanding fell by ₹750 and repaid rose by ₹750 |
| Browser preview: overdue filter | Showed the overdue unpaid entry |
| Receipt upload, size/type checks, retrieval, ownership | Passed in API integration tests |

The app has not yet been run on a physical Android/iOS device or native emulator. Production JavaScript export does not confirm native device permissions, secure storage, or image-picker behavior. Perform the phone check before recording the final mobile demonstration.

The local dependency audit reports 8 advisories in the Expo CLI / Router dependency trees (3 moderate, 5 high), including transitive `node-forge`, `zod`, and URI-decoding packages. The lockfile keeps the SDK 57-compatible dependency set; an automatic major SDK change was not applied. The application API's direct dependency versions are not the entries flagged by this audit. Recheck upstream fixes before deploying publicly.

The screenshots in `docs/screenshots` show the locally running browser preview with sample data. The local file `docs/miniledger-browser-demo.mp4` is a captioned, silent recording of the working browser preview, approximately 2 minutes 15 seconds long. It uses successive captures of the actual app during the demonstrated interactions. Upload it to Loom/Drive for a submission link, or record your own phone demonstration using `docs/DEMO.md`.
