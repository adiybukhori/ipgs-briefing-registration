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
    const r = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(req.body || {}),
      redirect: 'follow'
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); }
    catch { data = { success: false, message: 'Invalid response from registration backend.' }; }
    return res.status(data.success ? 200 : 400).json(data);
  } catch (error) {
    return res.status(502).json({ success: false, message: 'Unable to reach registration backend.' });
  }
}
