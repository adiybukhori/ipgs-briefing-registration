// Production notification now uses the authenticated ACC relay outbox.
import { createHmac } from 'node:crypto';

// DANIA integration is opt-in at deployment level: no network call without BOTH secrets.
// The primary registration/confirmation email must remain independent of webhook health.
async function notifyDaniaAfterSuccessfulRegistration(applicant, backendResult) {
  const url = process.env.DANIA_WEBHOOK_URL;
  const secret = process.env.DANIA_WEBHOOK_SECRET;
  if (!url || !secret || !backendResult.reference || backendResult.duplicate === true) return;

  let target;
  try {
    target = new URL(url);
    if (target.protocol !== 'https:' || !target.hostname) return;
  } catch {
    console.warn('[DANIA] Invalid webhook URL; registration unaffected');
    return;
  }

  const eventId = String(backendResult.reference);
  const event = {
    event: 'marketing_registration_completed',
    event_type: 'marketing_registration_completed',
    source: 'ipgs-briefing-registration',
    source_ref: eventId,
    idempotency_key: 'ipgs-briefing:' + eventId,
    occurred_at: new Date().toISOString(),
    email_status: 'send_function_completed_delivery_unverified',
    whatsapp_consent: applicant.whatsappConsent === true,
    whatsapp_consent_version: applicant.whatsappConsent === true
      ? 'ipgs-contact-consent-whatsapp-email-v2-2026-11-01' : null,
    applicant: {
      full_name: String(applicant.fullName || '').trim(),
      ic_passport: String(applicant.ic || '').trim(),
      phone: String(applicant.phone || '').trim(),
      email: String(applicant.email || '').trim(),
      programme: String(applicant.programme || '').trim(),
      preferred_intake: String(applicant.intake || '').trim()
    }
  };
  const timestamp = String(Math.floor(Date.now() / 1000));
  const serialized = JSON.stringify(event);
  const signature = createHmac('sha256', secret).update(timestamp + '.' + serialized).digest('hex');

  // Duplicate sends are safe only because the receiver MUST enforce source_ref idempotency.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(target.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Dania-Timestamp': timestamp,
          'X-Dania-Signature': 'sha256=' + signature,
          'X-Dania-Event-Id': eventId
        },
        body: serialized,
        signal: AbortSignal.timeout(1800)
      });
      if (response.ok) return;
      console.warn('[DANIA] webhook non-2xx', { eventId, status: response.status, attempt });
    } catch (error) {
      console.warn('[DANIA] webhook unavailable', { eventId, attempt, errorType: error?.name || 'Error' });
    }
    if (attempt === 1) await new Promise(resolve => setTimeout(resolve, 120));
  }
  // This warning contains no applicant PII; reconciliation must replay failed events.
  console.warn('[DANIA] webhook delivery deferred for reconciliation', { eventId });
}

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw-3lUfLrIpwtHxSH70z8WcW9kb_SBHbe1ohBYToMfz8ybA3NUtOVmLUVKIlSakODw/exec';

export default async function handler(req, res) {
  res.setHeader('X-Briefing-Proxy-Version', '20261006-new-email-only');
  if (req.method === 'GET') {
    try {
      const r = await fetch(APPS_SCRIPT_URL, { redirect: 'follow' });
      const text = await r.text();
      res.status(r.ok ? 200 : 502).setHeader('Content-Type', 'application/json').send(text);
    } catch (error) {
      res.status(502).json({ success: false, message: 'Apps Script backend is unavailable.' });
    }
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  try {
    const body = req.body || {};
    // Reject bypassed front-end consent checks; this covers both WhatsApp and email.
    if (body.contactConsent !== true || body.whatsappConsent !== true) {
      return res.status(400).json({ success: false, message: 'Please tick the required WhatsApp and email contact permission before submitting.' });
    }
    const receipt = body.receipt || {};

    const payload = {
      action: 'complete',
      contactConsent: true,
      contactConsentVersion: 'ipgs-contact-consent-whatsapp-email-v2-2026-11-01',
      contactConsentCapturedAt: new Date().toISOString(),
      fullName: body.fullName || '',
      ic: body.ic || body.icPassport || '',
      phone: body.phone || body.whatsapp || '',
      email: body.email || '',
      address: body.address || body.fullAddress || '',
      programme: body.programme || '',
      intake: body.intake || '',
      paymentMethod: body.paymentMethod || '',
      applicantType: body.applicantType || '',
      country: body.country || '',
      studyMode: body.studyMode || 'Full Time',
      source: body.source || '',
      campaign: body.campaign || '',
      utmSource: body.utmSource || '',
      utmMedium: body.utmMedium || '',
      utmCampaign: body.utmCampaign || '',
      receiptBase64: body.receiptBase64 || receipt.base64 || '',
      receiptName: body.receiptName || receipt.fileName || 'receipt',
      receiptMime: body.receiptMime || receipt.mimeType || 'application/octet-stream'
    };

    const r = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: false, message: 'Invalid response from registration backend.' };
    }

    const success = data.success === true || data.ok === true;
    if (success) {
      await notifyDaniaAfterSuccessfulRegistration({ ...payload, whatsappConsent: true }, data);
    }
    return res.status(success ? 200 : 400).json({
      ...data,
      success,
      message: data.message || data.error || (success ? 'Registration completed.' : 'Unable to complete registration.')
    });
  } catch (error) {
    return res.status(502).json({ success: false, message: 'Unable to reach registration backend.' });
  }
}
