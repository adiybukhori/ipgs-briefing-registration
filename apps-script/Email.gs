function sendColEmail_(p,duration,pdf,ref){
 const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const ADMISSION_SENDER='ipgs.admission@innovative.edu.my';
 const HEADER_URL='https://raw.githubusercontent.com/adiybukhori/ipgs-briefing-registration/main/assets/ipgs-header.jpg';
 const NOV_WHATSAPP='https://chat.whatsapp.com/LTVvdXPBFVuEDxiFCNbuHN';
 const JAN_WHATSAPP='https://chat.whatsapp.com/K3bhaOH5edAAvb6Wls7m25';

 let headerBlob=null;
 try{
  headerBlob=UrlFetchApp.fetch(HEADER_URL,{muteHttpExceptions:false}).getBlob().setName('IUC-IPGS-Header.jpg');
 }catch(err){
  console.warn('Unable to load email header: '+err);
 }

 const brandHeader=headerBlob
  ? `<div style="background:#ffffff;padding:0;text-align:center"><img src="cid:ipgsHeader" alt="Innovative University College | Institute of Postgraduate Studies" style="display:block;width:100%;max-width:700px;height:auto;border:0;margin:0 auto"></div>`
  : `<div style="background:#ffffff;padding:20px 28px;text-align:center;border-bottom:1px solid #eee"><div style="font-size:18px;font-weight:800;color:#5b2c83">Innovative University College</div><div style="font-size:12px;letter-spacing:1px;color:#766581;margin-top:4px">INSTITUTE OF POSTGRADUATE STUDIES</div></div>`;

 const html=`<!doctype html><html><body style="margin:0;padding:0;background:#f3f1f5;font-family:Arial,Helvetica,sans-serif;color:#2a2a2a">
 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f1f5;padding:28px 10px"><tr><td align="center">
 <table role="presentation" width="700" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:700px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e3ec;box-shadow:0 8px 28px rgba(0,0,0,.08)">
  <tr><td>${brandHeader}</td></tr>
  <tr><td style="background:#5b2c83;padding:30px 34px;text-align:center">
   <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#eadff1;font-weight:700">IPGS REGISTRY</div>
   <div style="font-size:28px;line-height:1.25;color:#ffffff;font-weight:800;margin-top:8px">Congratulations &amp; Welcome to IUC</div>
   <div style="font-size:14px;line-height:1.55;color:#eadff1;margin-top:8px">Your postgraduate journey starts here.</div>
  </td></tr>
  <tr><td style="padding:32px 34px">
   <p style="margin:0 0 18px;font-size:15px;line-height:1.7">Dear <strong>${esc(p.fullName)}</strong>,</p>
   <p style="margin:0 0 16px;font-size:15px;line-height:1.7">Congratulations! We are delighted to welcome you to <strong>Innovative University College (IUC)</strong>. We have received your registration following the IPGS briefing session, and your <strong>Conditional Offer Letter (COL)</strong> has been issued and attached to this email.</p>

   <div style="background:#f4eef8;border-left:4px solid #5b2c83;padding:18px 20px;border-radius:8px;margin:22px 0">
    <div style="font-size:17px;font-weight:800;color:#4a246c">${esc(p.programme)}</div>
    <div style="font-size:13px;line-height:1.8;color:#5f5268;margin-top:6px">Duration: <strong>${esc(duration)}</strong><br>Intake: <strong>${esc(p.intake)}</strong><br>Study Mode: <strong>${esc(p.studyMode||'Full Time')}</strong></div>
   </div>

   <div style="font-size:19px;font-weight:800;color:#5b2c83;margin:26px 0 8px">Your next step</div>
   <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#444">Please complete the <strong>Official IUC Admission Form</strong> so that IPGS Registry can proceed with your admission screening and registration.</p>
   <div style="text-align:center;margin:24px 0 30px"><a href="${REGISTRATION_LINK}" style="display:inline-block;background:#5b2c83;color:#ffffff;text-decoration:none;padding:15px 28px;border-radius:10px;font-size:16px;font-weight:800">Complete Admission Form →</a></div>

   <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:22px 0">
    <div style="font-size:17px;font-weight:800;color:#5b2c83;margin-bottom:10px">Steps to complete</div>
    <div style="font-size:14px;line-height:1.9;color:#475467"><strong>1.</strong> Review your attached Conditional Offer Letter (COL).<br><strong>2.</strong> Complete the Official IUC Admission Form using the button above.<br><strong>3.</strong> Upload the required admission documents in the form.<br><strong>4.</strong> Join the WhatsApp group for your intended intake below.<br><strong>5.</strong> Wait for IPGS Registry to review your application and advise you on the next admission stage.</div>
   </div>

   <div style="font-size:19px;font-weight:800;color:#5b2c83;margin:28px 0 8px">Join your intake WhatsApp group</div>
   <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#667085">Please join only the group for your intended intake. Important admission updates, orientation information and class announcements will be shared there.</p>
   <div style="text-align:center;margin:18px 0 8px"><a href="${NOV_WHATSAPP}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:13px 18px;border-radius:10px;font-size:14px;font-weight:800;margin:5px">Join November 2026 Group</a><a href="${JAN_WHATSAPP}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:13px 18px;border-radius:10px;font-size:14px;font-weight:800;margin:5px">Join January 2027 Group</a></div>

   <div style="margin:28px 0 0;border-top:1px solid #e5e7eb;padding-top:22px"><div style="font-size:17px;font-weight:800;color:#5b2c83;margin-bottom:10px">Your admission journey</div><div style="font-size:14px;line-height:1.9;color:#475467">1. Complete Admission Form<br>2. Admission Screening<br>3. Admission Endorsement<br>4. Orientation<br>5. Start Your Class</div></div>
   <p style="font-size:13px;line-height:1.6;color:#667085;margin-top:20px">Depending on the admission screening outcome, additional assessment or academic requirements may apply before final admission.</p>
   <div style="background:#fff8e8;border:1px solid #f2dfad;border-radius:10px;padding:16px;margin-top:22px;font-size:14px;line-height:1.7"><strong>Need assistance?</strong><br>En. Saiful Nizam<br>+60 17-870 8296</div>
   <p style="font-size:14px;line-height:1.7;margin-top:26px">We look forward to welcoming you as part of the <strong>IUC postgraduate community</strong>.</p>
   <p style="font-size:14px;line-height:1.55;margin-top:22px">Warm regards,<br><strong>IPGS Registry</strong><br>Institute of Postgraduate Studies<br>Innovative University College</p>
   <p style="font-size:11px;color:#98a2b3;margin-top:20px">Registration reference: ${esc(ref)} · This is a computer-generated email. No signature is required.</p>
  </td></tr>
  <tr><td style="background:#2f1b3d;padding:16px 24px;text-align:center;color:#d8cfe0;font-size:11px;line-height:1.6">Innovative University College · Institute of Postgraduate Studies</td></tr>
 </table></td></tr></table></body></html>`;

 const text=`Dear ${p.fullName},\n\nCongratulations & Welcome to IUC!\n\nWe have received your registration following the IPGS briefing session. Your Conditional Offer Letter (COL) for ${p.programme} is attached.\n\nNEXT STEP\nComplete the Official IUC Admission Form: ${REGISTRATION_LINK}\n\nSTEPS TO COMPLETE\n1. Review your attached Conditional Offer Letter (COL).\n2. Complete the Official IUC Admission Form.\n3. Upload the required admission documents.\n4. Join the WhatsApp group for your intended intake.\n5. Wait for IPGS Registry to review your application and advise you on the next stage.\n\nWHATSAPP GROUPS\nNovember 2026: ${NOV_WHATSAPP}\nJanuary 2027: ${JAN_WHATSAPP}\n\nFor assistance: En. Saiful Nizam, +60 17-870 8296.\n\nWarm regards,\nIPGS Registry\nInnovative University College`;

 const subject=`Congratulations & Welcome to IUC – ${p.programme}`;
 const options={
  htmlBody:html,
  attachments:[pdf.getBlob()],
  cc:CC_EMAILS,
  replyTo:ADMISSION_SENDER,
  name:'IPGS Admission'
 };
 if(headerBlob) options.inlineImages={ipgsHeader:headerBlob};
 try{
  const aliases=GmailApp.getAliases();
  if(aliases.indexOf(ADMISSION_SENDER)!==-1) options.from=ADMISSION_SENDER;
 }catch(err){
  console.warn('Unable to resolve Gmail alias: '+err);
 }
 GmailApp.sendEmail(p.email,subject,text,options);
}
