import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import handler from '../api/briefing.js';

const originalFetch = globalThis.fetch;
const originalUrl = process.env.DANIA_WEBHOOK_URL;
const originalSecret = process.env.DANIA_WEBHOOK_SECRET;

function fakeResponse() {
  return {
    code: 0, data: null, headers: {},
    setHeader(k,v) { this.headers[k] = v; return this; },
    status(n) { this.code = n; return this; },
    json(v) { this.data = v; return this; },
    send(v) { this.data = v; return this; }
  };
}

async function submit({ duplicate = false, consent = true, webhookOk = true } = {}) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('script.google.com')) return {
      ok: true, text: async () => JSON.stringify({
        ok: true, success: true, reference: 'TEST-BR-123',
        ...(duplicate ? { duplicate: true } : {})
      })
    };
    return { ok: webhookOk, status: webhookOk ? 202 : 500 };
  };
  process.env.DANIA_WEBHOOK_URL = 'https://dania.example.invalid/ingest';
  process.env.DANIA_WEBHOOK_SECRET = 'unit-test-secret-not-production';
  const res = fakeResponse();
  await handler({ method: 'POST', body: {
    fullName: 'Test Student', ic: 'TEST-ID', phone: '+601100000000',
    email: 'test@example.invalid', programme: 'MBA', intake: 'Jan 2027',
    receiptBase64: 'TEST_RECEIPT_BINARY_NEVER_FORWARD',
    whatsappConsent: consent, contactConsent: consent
  } }, res);
  return { res, calls };
}

test('successful registration produces a signed DANIA event without receipt data', async () => {
  const { res, calls } = await submit();
  assert.equal(res.code, 200);
  assert.equal(calls.length, 2);
  const request = calls[1].options;
  const event = JSON.parse(request.body);
  assert.equal(event.source_ref, 'TEST-BR-123');
  assert.equal(event.whatsapp_consent, true);
  assert.equal(event.applicant.email, 'test@example.invalid');
  assert.ok(!request.body.includes('TEST_RECEIPT_BINARY_NEVER_FORWARD'));
  const ts = request.headers['X-Dania-Timestamp'];
  const expected = createHmac('sha256', process.env.DANIA_WEBHOOK_SECRET)
    .update(ts + '.' + request.body).digest('hex');
  assert.equal(request.headers['X-Dania-Signature'], 'sha256=' + expected);
});

test('duplicate registration never re-emits a first-contact event', async () => {
  const { res, calls } = await submit({ duplicate: true });
  assert.equal(res.code, 200);
  assert.equal(calls.length, 1);
});

test('unchecked consent is communicated as false for HOLD decisions', async () => {
  const { calls } = await submit({ consent: false });
  assert.equal(JSON.parse(calls[1].options.body).whatsapp_consent, false);
});

test('DANIA webhook outage never turns a successful registration into a failure', async () => {
  const { res, calls } = await submit({ webhookOk: false });
  assert.equal(res.code, 200);
  assert.equal(res.data.success, true);
  assert.equal(calls.length, 3);
});


test('required combined contact consent cannot be bypassed by direct POST', async () => {
  const calls = [];
  globalThis.fetch = async (...args) => { calls.push(args); return { ok: true }; };
  const res = fakeResponse();
  await handler({method:'POST', body: {fullName: 'No Consent', whatsappConsent: true, contactConsent: false}}, res);
  assert.equal(res.code, 400);
  assert.equal(calls.length, 0);
});

test('successful submission sends combined channel consent to Apps Script', async () => {
  const { calls } = await submit();
  const payload = JSON.parse(calls[0].options.body);
  assert.equal(payload.contactConsent, true);
  assert.equal(payload.contactConsentVersion, 'ipgs-contact-consent-whatsapp-email-v2-2026-11-01');
  assert.ok(Number.isFinite(Date.parse(payload.contactConsentCapturedAt)));
});

process.on('exit', () => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.DANIA_WEBHOOK_URL;
  else process.env.DANIA_WEBHOOK_URL = originalUrl;
  if (originalSecret === undefined) delete process.env.DANIA_WEBHOOK_SECRET;
  else process.env.DANIA_WEBHOOK_SECRET = originalSecret;
});
