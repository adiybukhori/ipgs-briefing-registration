const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby7HwRJoOIlmND2knf8xepPmfwF_ZthVVEiKZcwQuPyGrhjRz1xUhrRSRQrPJ-TOw/exec';

export default async function handler(req, res) {
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
    const receipt = body.receipt || {};

    // The live Apps Script COL automation uses the legacy flat field names below.
    // Normalize the current briefing form payload so both systems stay compatible.
    const payload = {
      action: 'complete',
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
    return res.status(success ? 200 : 400).json({
      ...data,
      success,
      message: data.message || data.error || (success ? 'Registration completed.' : 'Unable to complete registration.')
    });
  } catch (error) {
    return res.status(502).json({ success: false, message: 'Unable to reach registration backend.' });
  }
}
