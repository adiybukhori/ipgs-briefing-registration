function sendColEmail_(p,duration,pdf,ref){
 const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const NOV_WHATSAPP='https://chat.whatsapp.com/LTVvdXPBFVuEDxiFCNbuHN';
 const JAN_WHATSAPP='https://chat.whatsapp.com/K3bhaOH5edAAvb6Wls7m25';

 const html=`
 <div style="margin:0;background:#f3f5f8;padding:30px 12px;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <div style="max-width:700px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.06)">

   <div style="background:#0e1b2a;padding:30px 32px;text-align:center;color:#ffffff">
    <div style="font-size:12px;letter-spacing:1.7px;color:#d4bd7d;font-weight:700">INSTITUTE OF POSTGRADUATE STUDIES</div>
    <div style="font-size:29px;font-weight:800;margin-top:10px">Congratulations & Welcome to IUC!</div>
    <div style="font-size:15px;color:#dbe4ee;margin-top:8px">Your postgraduate journey starts here.</div>
   </div>

   <div style="padding:32px">
    <p style="font-size:16px;margin-top:0">Dear <strong>${esc(p.fullName)}</strong>,</p>

    <p style="font-size:16px;line-height:1.7">Congratulations! We are delighted to welcome you to <strong>Innovative University College (IUC)</strong>. We have received your registration following the IPGS briefing session, and your <strong>Conditional Offer Letter (COL)</strong> has been issued and attached to this email.</p>

    <div style="background:#f7f8fa;border:1px solid #e8ebef;border-radius:14px;padding:20px;margin:24px 0">
     <div style="font-size:18px;font-weight:800;color:#0e1b2a">${esc(p.programme)}</div>
     <div style="font-size:14px;color:#667085;line-height:1.8;margin-top:6px">
      Duration: <strong>${esc(duration)}</strong><br>
      Intake: <strong>${esc(p.intake)}</strong><br>
      Study Mode: <strong>${esc(p.studyMode||'Full Time')}</strong>
     </div>
    </div>

    <div style="font-size:20px;font-weight:800;color:#0e1b2a;margin-top:28px">Your next step</div>
    <p style="font-size:15px;line-height:1.7">Please complete the <strong>Official IUC Admission Form</strong> so that the Registry Office can proceed with your admission screening and registration.</p>

    <div style="text-align:center;margin:24px 0 30px">
     <a href="${REGISTRATION_LINK}" style="display:inline-block;background:#0b6bd3;color:#ffffff;text-decoration:none;padding:15px 28px;border-radius:10px;font-size:16px;font-weight:800">Complete Admission Form →</a>
    </div>

    <div style="background:#f8fafc;border-radius:14px;padding:22px;margin:24px 0">
     <div style="font-size:18px;font-weight:800;color:#0e1b2a;margin-bottom:14px">Steps to complete</div>
     <div style="font-size:15px;line-height:2;color:#475467">
      <strong>1.</strong> Review your attached Conditional Offer Letter (COL).<br>
      <strong>2.</strong> Complete the Official IUC Admission Form using the button above.<br>
      <strong>3.</strong> Upload the required admission documents in the form.<br>
      <strong>4.</strong> Join the WhatsApp group for your intended intake below.<br>
      <strong>5.</strong> Wait for the Registry Office to review your application and advise you on the next admission stage.
     </div>
    </div>

    <div style="font-size:20px;font-weight:800;color:#0e1b2a;margin-top:30px">Join your intake WhatsApp group</div>
    <p style="font-size:14px;line-height:1.7;color:#667085">Please join the group that corresponds to your intended intake. Important admission updates, orientation information and class announcements will be shared there.</p>

    <div style="text-align:center;margin:20px 0 8px">
     <a href="${NOV_WHATSAPP}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:10px;font-size:14px;font-weight:800;margin:5px">Join November 2026 Group</a>
     <a href="${JAN_WHATSAPP}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:10px;font-size:14px;font-weight:800;margin:5px">Join January 2027 Group</a>
    </div>

    <div style="margin:30px 0 0;border-top:1px solid #e5e7eb;padding-top:24px">
     <div style="font-size:18px;font-weight:800;color:#0e1b2a;margin-bottom:12px">Your admission journey</div>
     <div style="font-size:14px;line-height:2;color:#475467">
      1. Complete Admission Form<br>
      2. Admission Screening<br>
      3. Admission Endorsement<br>
      4. Orientation<br>
      5. Start Your Class
     </div>
    </div>

    <p style="font-size:13px;line-height:1.6;color:#667085;margin-top:20px">Depending on the admission screening outcome, additional assessment or academic requirements may apply before final admission.</p>

    <div style="background:#faf8f2;border:1px solid #efe8d6;border-radius:12px;padding:17px;margin-top:24px;font-size:14px;line-height:1.7">
     <strong>Need assistance?</strong><br>
     En. Saiful Nizam<br>
     +60 17-870 8296
    </div>

    <p style="font-size:15px;line-height:1.6;margin-top:28px">We look forward to welcoming you as part of the IUC postgraduate community.</p>

    <p style="margin-top:24px">Warm regards,<br><strong>Registry Office</strong><br>Innovative University College</p>
    <p style="font-size:11px;color:#98a2b3;margin-top:22px">Registration reference: ${esc(ref)} · This is a computer-generated email. No signature is required.</p>
   </div>
  </div>
 </div>`;

 const text=`Dear ${p.fullName},\n\nCongratulations & Welcome to IUC!\n\nWe have received your registration following the IPGS briefing session. Your Conditional Offer Letter (COL) for ${p.programme} is attached.\n\nNEXT STEP\nComplete the Official IUC Admission Form: ${REGISTRATION_LINK}\n\nSTEPS TO COMPLETE\n1. Review your attached Conditional Offer Letter (COL).\n2. Complete the Official IUC Admission Form.\n3. Upload the required admission documents.\n4. Join the WhatsApp group for your intended intake.\n5. Wait for the Registry Office to review your application and advise you on the next stage.\n\nWHATSAPP GROUPS\nNovember 2026: ${NOV_WHATSAPP}\nJanuary 2027: ${JAN_WHATSAPP}\n\nAdmission journey: Complete Admission Form > Admission Screening > Admission Endorsement > Orientation > Start Your Class.\n\nFor assistance: En. Saiful Nizam, +60 17-870 8296.\n\nWarm regards,\nRegistry Office\nInnovative University College`;

 MailApp.sendEmail({
  to:p.email,
  cc:CC_EMAILS,
  subject:`Congratulations & Welcome to IUC – ${p.programme}`,
  body:text,
  htmlBody:html,
  attachments:[pdf.getBlob()]
 });
}
