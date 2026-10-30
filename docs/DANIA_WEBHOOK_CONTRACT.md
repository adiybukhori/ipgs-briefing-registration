# DANIA: Marketing registration event contract (2026-10-30)

## Status
Prepared in the Vercel registration backend. **Disabled until** both `DANIA_WEBHOOK_URL` and `DANIA_WEBHOOK_SECRET` are securely set in Vercel. This change does not install a public HTTPS reverse proxy on the Hostinger server, grant Google Sheets access, or create an ACC read API.

## Source and timing
The frontend `index.html` collects an **optional, unchecked** WhatsApp opt-in. The source registration POSTs to `/api/briefing`; the server calls the existing Google Apps Script. **Only after a successful backend response with a real `reference`** and `duplicate !== true`, Vercel tries the DANIA webhook. Confirmation email sending is performed by the existing Apps Script before it reports success; delivered-to-inbox status remains unverified.

The primary registration response is independent of DANIA failures. An unreachable webhook produces a sanitized server log warning and requires later reconciliation from registration data. Do not interpret Vercel success as WhatsApp sent.

## HTTPS endpoint & HMAC contract

Environment variables (set only in Vercel secrets, never in GitHub):
- `DANIA_WEBHOOK_URL`: full public HTTPS endpoint to existing authenticated DANIA receiver (must be configured through the VPS reverse proxy).
- `DANIA_WEBHOOK_SECRET`: shared high-entropy secret matching the DANIA webhook receiver.

Request:
- HTTP `POST`, `Content-Type: application/json`
- `X-Dania-Timestamp`: UNIX seconds
- `X-Dania-Signature`: `sha256=<lowercase hex HMAC-SHA256(secret, timestamp + "." + raw JSON body)>`
- `X-Dania-Event-Id`: the registration reference
- Valid JSON body, example:

```json
{
  "event": "marketing_registration_completed",
  "event_type": "marketing_registration_completed",
  "source": "ipgs-briefing-registration",
  "source_ref": "IPGS-2026-EXAMPLE",
  "idempotency_key": "ipgs-briefing:IPGS-2026-EXAMPLE",
  "occurred_at": "2026-10-30T10:00:00.000Z",
  "email_status": "send_function_completed_delivery_unverified",
  "whatsapp_consent": true,
  "whatsapp_consent_version": "ipgs-whatsapp-consent-v1-2026-10-30",
  "applicant": {
    "full_name": "Test Candidate",
    "ic_passport": "TEST-ONLY",
    "phone": "+601100000000",
    "email": "test@example.invalid",
    "programme": "Master of Business Administration (MBA)",
    "preferred_intake": "January 2027"
  }
}
```

The real event contains student PII and must be accepted only by the **verified** HTTPS DANIA endpoint. Never log raw event payloads or HMAC secrets. The receiver must:
1. Validate timestamp freshness, signature using constant-time comparison, and event type.
2. Deduplicate by `source_ref` **before** any outbound action; reject replay.
3. Store the consent boolean/evidence and check live withdrawal and existing ACC status.
4. Keep business-initiated WhatsApp in HOLD unless the authorised production transport and consent are valid. Consent `false` never authorises WhatsApp first contact.
5. Accept duplicate event deliveries with safe idempotent `2xx`; Vercel may retry the same event.
6. Report a minimal `2xx` on accepted events, using authenticated internal logs for details.

Currently the Vercel sender retries at most once after its first request, with 1.8s per-attempt timeout. This is not a durable queue. For guaranteed delivery, add a monitored replay/reconciliation job from the existing registration spreadsheet or use a transactional outbox in the submission handler.

## Production deployment checklist
1. Confirm the correct VPS hostname and expose the existing `127.0.0.1:8788` webhook through a private/upstream HTTPS reverse proxy.
2. Compare the real DANIA `dania_webhook_server.py` signature header and field names with this exact contract; **adapt sender or receiver before setting production env vars**. A successful unit test does not prove this match.
3. Set the two Vercel production environment variables securely.
4. Deploy to production.
5. Conduct a synthetic event test directly against the authenticated receiver; do not POST a fake registration to the live marketing form.
6. With approval, perform one controlled real registration using a consenting authorised test contact and verify `source_ref` appears exactly once in `DANIA_WA_QUEUE`, with ACC lookup and safe sending status.
7. Add replay monitor and service persistence. Keep NEXUS untouched.

No new person is to be contacted solely because the code was deployed.
