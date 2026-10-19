# IPGS Colloquium 1

19 November 2026, Thursday, 11:00 MYT (03:00 UTC). Online; meeting link not yet supplied.

Standalone Vercel project `ipgs-colloquium-1`, source folder `colloquium-1` in this repository. Existing briefing source is unchanged. `public/` contains the site and original institutional logo files; `/api/register` is the server-only signed proxy. Generated poster is included.

## Activation — pending

1. Create a **new standalone** Google Apps Script project under the intended institutional sender account. Install `backend/Code.gs` and the manifest; do not replace any existing admission/briefing scripts.
2. In Script Properties configure a new random `SHARED_SECRET` (at least 32 bytes); `WHATSAPP_GROUP_URL` must be the confirmed Colloquium group invite. Do not commit either secret or private invite to GitHub.
3. Run `setup()` once and approve Spreadsheet and Mail permissions. This creates a dedicated private response spreadsheet, stores `SHEET_ID`, and keeps registration closed. It does not send email. Deploy a web app that executes as the owner, accessible to Anyone. Access is authenticated by HMAC at the application layer.
4. Configure Vercel sensitive environment `COLLOQUIUM_SHARED_SECRET` to match and `COLLOQUIUM_BACKEND_URL` to the deployed URL. Redeploy. No credentials are exposed to browsers.
5. Set backend `REGISTRATION_OPEN=true` only after the WhatsApp group and sender account are confirmed. GET `/api/register` then tests backend availability. Test an attending response to the authorized owner's email, check the exact private sheet row and delivered HTML email, then test not-attending and retry without duplicate rows/messages.

Without the backend, the site deliberately displays 'Pendaftaran belum dibuka' and disables submission. Do not describe email or storage as active until the end-to-end test passes.

## Data and behavior

- Full name, matric ID, phone, email, full programme name, current RM1 enrollment, readiness, attendance, absence reason, optional research title/notes, consent.
- Save to a private Google Sheet before attempting mail. Server validation, HMAC, timestamp freshness, spreadsheet formula protection, HTML escaping.
- One receipt per event + normalized email + matric ID. Duplicate submissions return the original receipt. Changes require staff contact using the receipt number, preventing unauthenticated overwrites.
- Attending: confirmation plus WhatsApp invitation. Not attending: response acknowledgment without invitation.
- Sheet email states: PENDING (quota unavailable), SENDING, SENT, REVIEW_REQUIRED. SENDING/REVIEW_REQUIRED must be reconciled with sender logs before manually retrying. No automatic ambiguous resend.
- The tentative agenda is explicitly a proposal, with no invented end time.

## Checks

`npm test` checks validation, closed registration, and backend behavior using mocked Apps Script services. This is not a live delivery test.
