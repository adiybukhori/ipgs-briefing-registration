/** Standalone Colloquium 1 backend. Configure Script Properties, then run setup(). */
const EVENT_ID='RM1-20261119-C1';
const HEADERS=['Timestamp MYT','Reference','Full name','Matric ID','Email','WhatsApp','Programme','Readiness','Attendance','Reason','Research title','Notes','RM1 confirmed','Consent','Email status','Email sent at','Submission hash'];
function setup(){
 const props=PropertiesService.getScriptProperties();
 if(!props.getProperty('SHEET_ID')){
  const ss=SpreadsheetApp.create('IPGS Colloquium 1 — 19 November 2026 — Responses');
  ss.setSpreadsheetTimeZone('Asia/Kuala_Lumpur');const sheet=ss.getSheets()[0];sheet.setName('Responses');sheet.appendRow(HEADERS);sheet.setFrozenRows(1);sheet.getRange(1,1,1,HEADERS.length).setBackground('#48215e').setFontColor('#ffffff').setFontWeight('bold');sheet.setColumnWidths(1,HEADERS.length,170);props.setProperty('SHEET_ID',ss.getId());
 }
 if(!props.getProperty('REGISTRATION_OPEN'))props.setProperty('REGISTRATION_OPEN','false');
 // Does not send email. Forces MailApp permission during owner setup.
 MailApp.getRemainingDailyQuota();
 return SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getUrl();
}
function json_(x){return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON);}
function settings_(){const p=PropertiesService.getScriptProperties();const wa=p.getProperty('WHATSAPP_GROUP_URL')||'';return {secret:p.getProperty('SHARED_SECRET'),sheetId:p.getProperty('SHEET_ID'),whatsapp:wa,open:p.getProperty('REGISTRATION_OPEN')==='true'&&!!p.getProperty('SHEET_ID')&&/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+(?:\?.*)?$/.test(wa)};}
function doPost(e){
 try{
  const raw=JSON.parse(e.postData.contents);const cfg=settings_();if(!cfg.secret||typeof raw.payload!=='string'||raw.payload.length>12000)return json_({saved:false,message:'Invalid request.'});
  const sig=Utilities.computeHmacSha256Signature(raw.payload,cfg.secret).map(x=>('0'+(x&255).toString(16)).slice(-2)).join('');
  if(sig!==raw.signature)return json_({saved:false,message:'Invalid request.'});
  const p=JSON.parse(raw.payload);if(Math.abs(Date.now()-Number(p.timestamp))>300000)return json_({saved:false,message:'Expired request.'});
  if(p.action==='health')return json_({open:cfg.open});
  if(p.action!=='register'||!cfg.open)return json_({saved:false,code:'closed',message:'Pendaftaran belum dibuka.'});
  const d=p.input;validate_(d);
  const lock=LockService.getScriptLock();lock.waitLock(20000);try{return json_(register_(d,cfg));}finally{lock.releaseLock();}
 }catch(error){console.error('Colloquium request failed: '+String(error.message||error).slice(0,150));return json_({saved:false,message:'Respons belum dapat diproses. Sila cuba semula.'});}
}
function validate_(d){
 if(!d||typeof d!=='object')throw Error('Invalid data');
 const limits={fullName:150,matricId:30,phone:25,email:254,programme:150,readiness:20,attendance:20,reason:1000,researchTitle:500,notes:1000};
 Object.keys(limits).forEach(k=>{if(typeof d[k]!=='string'||d[k].length>limits[k])throw Error('Invalid field');});
 if(!d.fullName||!d.matricId||!d.programme||!/^\S+@[^\s@]+\.[^\s@]+$/.test(d.email)||!/^\d{7,15}$/.test(d.phone.replace(/\D/g,''))||!['ready','not_ready','guidance'].includes(d.readiness)||!['attend','not_attend'].includes(d.attendance)||d.rm1!==true||d.consent!==true||(d.attendance==='not_attend'&&!d.reason))throw Error('Invalid data');
}
function safe_(x){const s=String(x||'');return /^[\s]*[=+@-]/.test(s)?"'"+s:s;}
function hash_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s).map(x=>('0'+(x&255).toString(16)).slice(-2)).join('');}
function register_(d,cfg){
 const sheet=SpreadsheetApp.openById(cfg.sheetId).getSheetByName('Responses');if(!sheet)throw Error('Missing response sheet');
 const rows=sheet.getDataRange().getValues();const key=hash_(EVENT_ID+'|'+d.email.toLowerCase()+'|'+d.matricId.toUpperCase());
 const match=rows.findIndex((r,i)=>i>0&&r[16]===key);
 if(match>=0){const old=rows[match];return {saved:true,duplicate:true,reference:old[1],emailStatus:old[14]==='SENT'?'sent':'review',whatsappUrl:old[8]==='Hadir'?cfg.whatsapp:null};}
 const reference='C1-261119-'+Utilities.getUuid().slice(0,8).toUpperCase();
 const ready={ready:'Sudah bersedia',not_ready:'Belum bersedia',guidance:'Memerlukan panduan lanjut'}[d.readiness];const attendance=d.attendance==='attend'?'Hadir':'Tidak Hadir';
 sheet.appendRow([Utilities.formatDate(new Date(),'Asia/Kuala_Lumpur','yyyy-MM-dd HH:mm:ss'),reference,safe_(d.fullName),safe_(d.matricId),safe_(d.email),safe_(d.phone),safe_(d.programme),ready,attendance,safe_(d.reason),safe_(d.researchTitle),safe_(d.notes),'Yes','Yes','PENDING','',key]);const row=sheet.getLastRow();SpreadsheetApp.flush();
 let state='review';
 // Claim before dispatch. If execution is interrupted, staff reconcile SENDING/REVIEW
 // rather than automatically send twice. Retrying the form returns the existing receipt.
 if(MailApp.getRemainingDailyQuota()>0){
  sheet.getRange(row,15).setValue('SENDING');SpreadsheetApp.flush();
  try{sendConfirmation_(d,reference,cfg.whatsapp);state='sent';try{sheet.getRange(row,15,1,2).setValues([['SENT',new Date()]]);SpreadsheetApp.flush();}catch(statusError){console.error('Email sent; status needs reconciliation for '+reference);}}
  catch(mailError){try{sheet.getRange(row,15).setValue('REVIEW_REQUIRED');}catch(ignore){}console.error('Email needs reconciliation for '+reference);}
 }
 return {saved:true,reference:reference,emailStatus:state,whatsappUrl:d.attendance==='attend'?cfg.whatsapp:null};
}
function esc_(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function sendConfirmation_(d,reference,whatsapp){
 const attending=d.attendance==='attend';const status=attending?'Hadir':'Tidak Hadir';const wa=attending?'<p style="margin:28px 0"><a href="'+esc_(whatsapp)+'" style="background:#48215e;color:#ffffff;padding:14px 22px;text-decoration:none;border-radius:5px;display:inline-block">Sertai kumpulan WhatsApp</a></p>':'';
 const next=attending?'Pautan sesi dalam talian dan maklumat lanjut akan dikongsikan oleh IPGS. Sila sertai kumpulan WhatsApp untuk menerima kemas kini.':'Terima kasih kerana memaklumkan ketidakhadiran anda. Maklum balas anda telah direkodkan oleh pihak IPGS.';
 const html='<div style="background:#f5f1f7;padding:28px 12px;font-family:Arial,sans-serif;color:#34223f"><div style="max-width:620px;margin:auto;background:#fff;border-radius:10px;overflow:hidden"><div style="padding:25px;background:#fff;border-bottom:2px solid #b78a46"><img src="https://ipgs-colloquium-1.vercel.app/assets/iuc.png" width="220" alt="Innovative University College" style="max-width:46%;vertical-align:middle;margin-right:6%"><img src="https://ipgs-colloquium-1.vercel.app/assets/ipgs.png" width="220" alt="Institute of Postgraduate Studies" style="max-width:46%;vertical-align:middle"></div><div style="padding:30px"><p style="color:#9b7134;letter-spacing:2px;font-size:12px">PENGESAHAN RESPONS</p><h1 style="font-family:Georgia,serif;color:#48215e">Colloquium 1</h1><p>Salam sejahtera '+esc_(d.fullName)+',</p><p>Respons anda bagi <b>Colloquium 1 — Research Methodology 1</b> telah diterima.</p><table cellpadding="9" style="width:100%;background:#f7f2f9;border-collapse:collapse;font-size:14px"><tr><td>Tarikh</td><td><b>19 November 2026 (Khamis)</b></td></tr><tr><td>Masa</td><td>11.00 pagi (waktu Malaysia)</td></tr><tr><td>Mod</td><td>Dalam talian</td></tr><tr><td>Kehadiran</td><td><b>'+status+'</b></td></tr><tr><td>Kesediaan</td><td>'+esc_({ready:'Sudah bersedia',not_ready:'Belum bersedia',guidance:'Memerlukan panduan lanjut'}[d.readiness])+'</td></tr><tr><td>No. rujukan</td><td>'+esc_(reference)+'</td></tr></table><p>'+next+'</p>'+wa+'<p style="font-size:12px;color:#766b7d">Sekiranya terdapat kesilapan atau perubahan kehadiran, sila balas e-mel ini dengan nombor rujukan anda.</p><p>Terima kasih.<br><b>Institute of Postgraduate Studies (IPGS)</b><br>Innovative University College</p></div></div></div>';
 const plain='Salam sejahtera '+d.fullName+',\n\nRespons Colloquium 1 — Research Methodology 1 telah diterima.\n19 November 2026 (Khamis), 11.00 pagi MYT. Dalam talian.\nKehadiran: '+status+'\nRujukan: '+reference+'\n\n'+next+(attending?'\nWhatsApp: '+whatsapp:'')+'\n\nIPGS — Innovative University College';
 MailApp.sendEmail({to:d.email,subject:'Pengesahan '+status+' | Colloquium 1 | 19 November 2026',body:plain,htmlBody:html,name:'IPGS | Innovative University College'});
}
