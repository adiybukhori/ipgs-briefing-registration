const MKT_FOLLOWUP_CONFIG = {
  briefingSpreadsheetId: '1PVTgF2nXDEooRkA1LGbTsApx3SFfgcYnLb3M5JiyAHc',
  briefingSheetName: 'Registrations',
  v2SpreadsheetId: '1O-Y-q7_q78xKM1p5e2C3EWyQfYr5rXvhO0oWbVaw5Mw',
  v2SheetName: 'V2_APPLICATIONS',
  admissionFormUrl: 'https://ipgs-admission-form.innovative.edu.my/',
  replyTo: 'ipgs.admission@innovative.edu.my',
  senderName: 'IPGS Admission',
  timeZone: 'Asia/Kuala_Lumpur',
  businessHourStart: 9,
  businessHourEnd: 18,
  reminderDays: [1, 3, 7]
};

/**
 * Marketing-only admission follow-up.
 * This does not update or depend on the ACC UI/workflow.
 * It reads Official Admission Form V2 only to verify whether the applicant submitted the form.
 */
function marketingSyncAdmissionFormStatus() {
  const cfg = MKT_FOLLOWUP_CONFIG;
  const ss = SpreadsheetApp.openById(cfg.briefingSpreadsheetId);
  const sh = ss.getSheetByName(cfg.briefingSheetName);
  const v2sh = SpreadsheetApp.openById(cfg.v2SpreadsheetId).getSheetByName(cfg.v2SheetName);
  if (!sh) throw new Error('Briefing Registrations sheet not found.');
  if (!v2sh) throw new Error('V2_APPLICATIONS sheet not found.');

  const regValues = sh.getDataRange().getValues();
  if (regValues.length < 2) return { checked: 0, completed: 0, pending: 0, review: 0 };
  const h = headerMap_(regValues[0]);

  const required = [
    'Timestamp','Registration Reference','Full Name','IC / Passport','Email Address',
    'Admission Form Status','V2 Admission Reference','Admission Form Submitted At','Match Method',
    'Reminder 1 Sent At','Reminder 2 Sent At','Final Reminder Sent At','Last Reminder Sent At',
    'Next Reminder Due','Follow-Up Status','Reminder Override','Follow-Up Notes','Last Checked At'
  ];
  required.forEach(x => { if (h[x] == null) throw new Error('Missing marketing column: ' + x); });

  const v2Values = v2sh.getDataRange().getValues();
  const vh = headerMap_(v2Values[0] || []);
  ['Reference No','Submitted At','Student Name','ID / Passport No','Personal Email'].forEach(x => {
    if (vh[x] == null) throw new Error('Missing V2 column: ' + x);
  });

  const byEmail = new Map();
  const byId = new Map();
  for (let r = 1; r < v2Values.length; r++) {
    const row = v2Values[r];
    const ref = String(row[vh['Reference No']] || '').trim();
    if (!ref) continue;
    const item = {
      ref,
      submittedAt: row[vh['Submitted At']] || '',
      name: normalizeName_(row[vh['Student Name']]),
      id: normalizeId_(row[vh['ID / Passport No']]),
      email: normalizeEmail_(row[vh['Personal Email']])
    };
    if (item.email && !byEmail.has(item.email)) byEmail.set(item.email, item);
    if (item.id) {
      if (!byId.has(item.id)) byId.set(item.id, []);
      byId.get(item.id).push(item);
    }
  }

  const now = new Date();
  let completed = 0, pending = 0, review = 0;
  const output = [];

  for (let r = 1; r < regValues.length; r++) {
    const row = regValues[r];
    const ref = String(row[h['Registration Reference']] || '').trim();
    if (!ref) {
      output.push(new Array(13).fill(''));
      continue;
    }

    const regName = normalizeName_(row[h['Full Name']]);
    const regId = normalizeId_(row[h['IC / Passport']]);
    const regEmail = normalizeEmail_(row[h['Email Address']]);
    const override = String(row[h['Reminder Override']] || '').trim().toUpperCase();

    let status = 'PENDING';
    let matchMethod = '';
    let matched = null;

    if (regEmail && byEmail.has(regEmail)) {
      matched = byEmail.get(regEmail);
      status = 'COMPLETED';
      matchMethod = 'EMAIL EXACT';
    } else if (regId && byId.has(regId)) {
      const sameId = byId.get(regId);
      const sameName = sameId.find(x => x.name && regName && x.name === regName);
      if (sameName) {
        matched = sameName;
        status = 'COMPLETED';
        matchMethod = 'ID + NAME EXACT';
      } else {
        matched = sameId[0];
        status = 'REVIEW MATCH';
        matchMethod = 'ID EXISTS / NAME OR EMAIL DIFFERS';
      }
    }

    const r1 = row[h['Reminder 1 Sent At']] || '';
    const r2 = row[h['Reminder 2 Sent At']] || '';
    const rf = row[h['Final Reminder Sent At']] || '';
    const last = row[h['Last Reminder Sent At']] || '';
    const registeredAt = parseDate_(row[h['Timestamp']]);
    let nextDue = '';
    let followUp = '';

    if (status === 'COMPLETED') {
      followUp = 'COMPLETED';
      completed++;
    } else if (status === 'REVIEW MATCH') {
      followUp = 'REVIEW';
      review++;
    } else if (override === 'SKIP REMINDERS') {
      followUp = 'EXCLUDED';
      pending++;
    } else {
      pending++;
      if (registeredAt) {
        if (!r1) nextDue = addDays_(registeredAt, cfg.reminderDays[0]);
        else if (!r2) nextDue = addDays_(registeredAt, cfg.reminderDays[1]);
        else if (!rf) nextDue = addDays_(registeredAt, cfg.reminderDays[2]);
      }
      if (rf) followUp = 'FINAL SENT';
      else if (nextDue && now >= nextDue) followUp = 'DUE';
      else followUp = 'SCHEDULED';
    }

    output.push([
      status,
      matched ? matched.ref : '',
      matched ? matched.submittedAt : '',
      matchMethod,
      r1,
      r2,
      rf,
      last,
      nextDue,
      followUp,
      row[h['Reminder Override']] || '',
      row[h['Follow-Up Notes']] || '',
      now
    ]);
  }

  if (output.length) sh.getRange(2, 21, output.length, 13).setValues(output);
  return { checked: output.length, completed, pending, review };
}

function marketingSendDueAdmissionFormReminders() {
  const cfg = MKT_FOLLOWUP_CONFIG;
  const localHour = Number(Utilities.formatDate(new Date(), cfg.timeZone, 'H'));
  if (localHour < cfg.businessHourStart || localHour >= cfg.businessHourEnd) {
    return { sent: 0, skipped: 'outside business hours' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    marketingSyncAdmissionFormStatus();

    const ss = SpreadsheetApp.openById(cfg.briefingSpreadsheetId);
    const sh = ss.getSheetByName(cfg.briefingSheetName);
    const values = sh.getDataRange().getValues();
    const h = headerMap_(values[0]);
    const now = new Date();
    let sent = 0;

    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const ref = String(row[h['Registration Reference']] || '').trim();
      if (!ref) continue;
      if (String(row[h['Admission Form Status']] || '') !== 'PENDING') continue;
      if (String(row[h['Follow-Up Status']] || '') !== 'DUE') continue;
      if (String(row[h['Reminder Override']] || '').trim().toUpperCase() === 'SKIP REMINDERS') continue;

      const email = normalizeEmail_(row[h['Email Address']]);
      if (!email) continue;

      let stage = 1;
      if (row[h['Reminder 1 Sent At']]) stage = 2;
      if (row[h['Reminder 2 Sent At']]) stage = 3;
      if (row[h['Final Reminder Sent At']]) continue;

      sendMarketingAdmissionReminderEmail_(row, h, stage);

      const rowNo = r + 1;
      if (stage === 1) sh.getRange(rowNo, h['Reminder 1 Sent At'] + 1).setValue(now);
      if (stage === 2) sh.getRange(rowNo, h['Reminder 2 Sent At'] + 1).setValue(now);
      if (stage === 3) sh.getRange(rowNo, h['Final Reminder Sent At'] + 1).setValue(now);
      sh.getRange(rowNo, h['Last Reminder Sent At'] + 1).setValue(now);
      sent++;
    }

    marketingSyncAdmissionFormStatus();
    return { sent };
  } finally {
    lock.releaseLock();
  }
}

function marketingSendReminderNowByReference(registrationReference) {
  if (!registrationReference) throw new Error('Registration reference is required.');
  marketingSyncAdmissionFormStatus();
  const cfg = MKT_FOLLOWUP_CONFIG;
  const sh = SpreadsheetApp.openById(cfg.briefingSpreadsheetId).getSheetByName(cfg.briefingSheetName);
  const values = sh.getDataRange().getValues();
  const h = headerMap_(values[0]);
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (String(row[h['Registration Reference']] || '').trim() !== String(registrationReference).trim()) continue;
    if (String(row[h['Admission Form Status']] || '') === 'COMPLETED') return { sent: false, reason: 'already completed' };
    if (String(row[h['Admission Form Status']] || '') === 'REVIEW MATCH') return { sent: false, reason: 'review match first' };
    const stage = row[h['Reminder 2 Sent At']] ? 3 : row[h['Reminder 1 Sent At']] ? 2 : 1;
    sendMarketingAdmissionReminderEmail_(row, h, stage);
    const now = new Date();
    const rowNo = r + 1;
    if (stage === 1) sh.getRange(rowNo, h['Reminder 1 Sent At'] + 1).setValue(now);
    if (stage === 2) sh.getRange(rowNo, h['Reminder 2 Sent At'] + 1).setValue(now);
    if (stage === 3) sh.getRange(rowNo, h['Final Reminder Sent At'] + 1).setValue(now);
    sh.getRange(rowNo, h['Last Reminder Sent At'] + 1).setValue(now);
    marketingSyncAdmissionFormStatus();
    return { sent: true, stage };
  }
  throw new Error('Registration reference not found.');
}

function marketingInstallHourlyTrigger() {
  const fn = 'marketingSendDueAdmissionFormReminders';
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === fn).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(fn).timeBased().everyHours(1).create();
  return 'Hourly trigger installed. Emails are restricted to 09:00–17:59 Malaysia time.';
}

function sendMarketingAdmissionReminderEmail_(row, h, stage) {
  const cfg = MKT_FOLLOWUP_CONFIG;
  const name = escapeHtml_(row[h['Full Name']]);
  const programme = escapeHtml_(row[h['Programme']]);
  const intake = escapeHtml_(row[h['Preferred Intake']]);
  const ref = escapeHtml_(row[h['Registration Reference']]);
  const email = normalizeEmail_(row[h['Email Address']]);

  const subjects = {
    1: 'Reminder: Complete Your IUC Admission Form',
    2: 'Action Required: Complete Your IUC Admission Form',
    3: 'Final Reminder: Complete Your IUC Admission Form'
  };
  const lead = stage === 1
    ? 'This is a friendly reminder to complete your Official IUC Admission Form.'
    : stage === 2
      ? 'Our record still shows that your Official IUC Admission Form has not been completed.'
      : 'This is our final automated reminder to complete your Official IUC Admission Form so we can proceed with your admission registration.';

  const html = `<div style="margin:0;background:#f3f1f5;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;color:#2a2a2a">
    <div style="max-width:620px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8e3ec">
      <div style="background:#5b2c83;padding:28px 32px;color:#fff">
        <div style="font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:#eadff1;font-weight:700">IPGS Registry</div>
        <div style="font-size:26px;line-height:1.25;font-weight:700;margin-top:8px">${stage === 3 ? 'Final Admission Form Reminder' : 'Complete Your IUC Admission Form'}</div>
        <div style="font-size:14px;line-height:1.55;color:#eadff1;margin-top:8px">Your registration is already in our record.</div>
      </div>
      <div style="padding:30px 32px">
        <p style="font-size:15px;line-height:1.7;margin-top:0">Dear <strong>${name}</strong>,</p>
        <p style="font-size:15px;line-height:1.7">${lead}</p>
        <div style="background:#f4eef8;border-left:4px solid #5b2c83;border-radius:8px;padding:16px 18px;margin:22px 0;font-size:14px;line-height:1.7">
          <strong>${programme}</strong><br>Intended intake: <strong>${intake}</strong>
        </div>
        <p style="font-size:15px;line-height:1.7">Please submit the form and supporting documents so that IPGS Registry can review your information and proceed with the next admission step.</p>
        <div style="text-align:center;margin:26px 0 28px">
          <a href="${cfg.admissionFormUrl}" style="display:inline-block;background:#5b2c83;color:#fff;text-decoration:none;padding:15px 28px;border-radius:10px;font-size:16px;font-weight:700">Complete Admission Form →</a>
        </div>
        <p style="font-size:13px;line-height:1.65;color:#666">If you have already submitted the Admission Form recently, you may disregard this email. Our system will automatically stop reminders once your submission is matched.</p>
        <p style="margin-top:24px;font-size:14px;line-height:1.6">Warm regards,<br><strong>IPGS Registry</strong><br>Institute of Postgraduate Studies<br>Innovative University College</p>
        <p style="font-size:11px;color:#999;margin-top:20px">Briefing registration reference: ${ref} · Automated follow-up email.</p>
      </div>
      <div style="background:#2f1b3d;padding:16px 24px;text-align:center;color:#d8cfe0;font-size:11px;line-height:1.6">Innovative University College · Institute of Postgraduate Studies</div>
    </div>
  </div>`;

  const text = `Dear ${row[h['Full Name']]},\n\n${lead}\n\nProgramme: ${row[h['Programme']]}\nIntended intake: ${row[h['Preferred Intake']]}\n\nComplete Admission Form: ${cfg.admissionFormUrl}\n\nIf you have already submitted the form recently, you may disregard this email.\n\nIPGS Registry\nInnovative University College`;

  MailApp.sendEmail({
    to: email,
    subject: subjects[stage],
    body: text,
    htmlBody: html,
    replyTo: cfg.replyTo,
    name: cfg.senderName
  });
}

function headerMap_(headers) {
  const m = {};
  headers.forEach((x, i) => { const k = String(x || '').trim(); if (k) m[k] = i; });
  return m;
}

function normalizeEmail_(v) {
  return String(v || '').trim().toLowerCase();
}

function normalizeId_(v) {
  return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizeName_(v) {
  return String(v || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseDate_(v) {
  if (v instanceof Date && !isNaN(v)) return v;
  if (!v) return null;
  const d = new Date(v);
  if (!isNaN(d)) return d;
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6] || 0));
  return null;
}

function addDays_(d, days) {
  return new Date(d.getTime() + Number(days) * 24 * 60 * 60 * 1000);
}

function escapeHtml_(v) {
  return String(v || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
