# Submission checklist

Deadline supplied in the assignment: **24 October 2026**. No submission time was specified.

## Before publishing

- Run the README from a fresh checkout with Node 24 and PostgreSQL.
- Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build:api`.
- Test login, adding an entry, overdue highlighting, and repayment on the phone you will demonstrate.
- Check that `.env`, `.local`, `node_modules`, and generated build folders are excluded by `.gitignore`.
- Record the 2–3 minute demo using `docs/DEMO.md`.

## Publish to GitHub

Create an empty repository named `miniledger` under your GitHub account. Do not initialize it with a second README. Then run these commands from this project's root, using the URL shown by GitHub:

```sh
git init -b main
git add .
git commit -m "Build MiniLedger internship assignment"
git remote add origin https://github.com/YOUR_USERNAME/miniledger.git
git push -u origin main
```

Replace `YOUR_USERNAME` before running the remote command. A public repository is easy for a reviewer to open; if you choose a private repository, grant the reviewer access. Check the published files and README afterward.

If using GitHub Desktop, add this folder as a local repository, create the initial commit, and publish it there instead.

## Share the video

Upload the recording to Loom or Google Drive. Open the shared link in a signed-out browser to confirm it is viewable without an access request. A local video file path is not a submission link.

## Final message to Harsh

Hi Harsh,

I've completed MiniLedger for the Full Stack Development internship assignment.

GitHub repository: [paste the published repository link]

App demonstration (2–3 minutes): [paste the Loom or Google Drive link]

The app includes phone login with a mock OTP, loan creation and repayment, summary totals, overdue highlighting, receipt uploads, input validation, and backend integration tests. Setup instructions are in the README.

Thank you for the opportunity.

[Your name]
