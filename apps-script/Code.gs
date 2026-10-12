const ROOT_FOLDER_ID='1vUYgkLM9NjZTjJKP1CHegrx8Zd1cE1_0';
const BRIEFING_SHEET_ID='1BBrA7RDKDHCek02aIr4XBShZ4X91KvyZfyy-lBPlAP8';
const BRIEFING_SHEET_NAME='IPGS Briefing Registration';

// Same COL template used by the existing Trio automation.
const TEMPLATE_DOC_ID='1q9cji_T_XDa5OMM5u_S0UYrQviX8h8H0iAZL9MKj7ec';
const REGISTRATION_LINK='https://ipgs-admission-form.innovative.edu.my/';

// Same CC recipients used by the existing Trio response automation.
const CC_EMAILS=[
  'adiybukhori@innovative.edu.my',
  'saiful.nizam@innovative.edu.my',
  'khidir.hazidi@innovative.edu.my'
].join(',');

function doPost(e){
 try{
  const raw=JSON.parse(e.postData.contents||'{}');
  const p=normalizePayload_(raw);

  if(p.action==='lead') return json_({ok:true,success:true,leadId:'IPGS-'+Date.now().toString().slice(-8)});
  if(p.action!=='complete') throw new Error('Invalid action');

  const lock=LockService.getScriptLock();
  lock.waitLock(15000);
  try{return json_(completeRegistration_(p));}
  finally{lock.releaseLock();}
 }catch(err){
  return json_({ok:false,success:false,error:String(err.message||err),message:String(err.message||err)});
 }
}

function normalizePayload_(raw){
 const receipt=raw.receipt||{};
 return {
  action:raw.action||'complete',
  fullName:raw.fullName||'',
  ic:raw.ic||raw.icPassport||'',
  phone:raw.phone||raw.whatsapp||'',
  email:raw.email||'',
  address:raw.address||raw.fullAddress||'',
  programme:raw.programme||'',
  intake:raw.intake||'',
  paymentMethod:raw.paymentMethod||'',
  applicantType:raw.applicantType||'',
  country:raw.country||'',
  studyMode:raw.studyMode||'Full Time',
  source:raw.source||'',
  campaign:raw.campaign||'',
  utmSource:raw.utmSource||'',
  utmMedium:raw.utmMedium||'',
  utmCampaign:raw.utmCampaign||'',
  receiptBase64:raw.receiptBase64||receipt.base64||'',
  receiptName:raw.receiptName||receipt.fileName||'receipt',
  receiptMime:raw.receiptMime||receipt.mimeType||'application/octet-stream'
 };
}

function completeRegistration_(p){
 ['fullName','ic','phone','email','address','programme','intake','paymentMethod','receiptBase64','receiptName']
  .forEach(k=>{if(!p[k])throw new Error('Missing '+k)});

 const props=PropertiesService.getScriptProperties();
 const key='DONE_'+String(p.email).toLowerCase()+'_'+p.ic;
 const old=props.getProperty(key);
 if(old)return {ok:true,success:true,reference:old,duplicate:true};

 const ref='IPGS-'+Date.now().toString().slice(-8);
 const root=DriveApp.getFolderById(ROOT_FOLDER_ID);
 const safe=String(p.fullName).replace(/[^A-Za-z0-9_-]+/g,'_');
 const folder=root.createFolder(safe+'_'+p.ic);
 const docs=folder.createFolder('01_Application_Documents');
 const offers=folder.createFolder('02_Offer_Letter');

 const bytes=Utilities.base64Decode(String(p.receiptBase64).replace(/^data:[^,]+,/,''));
 const receiptFile=docs.createFile(Utilities.newBlob(bytes,p.receiptMime||'application/octet-stream','PAYMENT_RECEIPT_'+p.receiptName));

 const duration=getDuration_(p.programme);
 const issueDate=Utilities.formatDate(new Date(),'GMT+8','dd MMMM yyyy');

 const copy=DriveApp.getFileById(TEMPLATE_DOC_ID).makeCopy('TEMP_COL_'+safe,offers);
 const doc=DocumentApp.openById(copy.getId());
 const body=doc.getBody();
 const map={
  '{{FULL_NAME}}':p.fullName,
  '{{IC}}':p.ic,
  '{{PERMANENT_ADDRESS}}':formatAddress_(p.address),
  '{{PROGRAM}}':p.programme,
  '{{STUDY_MODE}}':p.studyMode||'Full Time',
  '{{PROGRAMME_DURATION}}':duration,
  '{{INTAKE}}':p.intake,
  '{{DATE_ISSUED}}':issueDate
 };
 Object.keys(map).forEach(k=>body.replaceText(k,map[k]||''));
 doc.saveAndClose();

 const pdf=offers.createFile(copy.getAs(MimeType.PDF)).setName('COL_'+safe+'_'+p.ic+'.pdf');
 copy.setTrashed(true);

 // Persist the application before emailing: a Sheet failure must not silently send a COL.
 const registrationRow=saveBriefingRegistrationRow_(p,ref,receiptFile.getUrl(),pdf.getUrl());
 sendColEmail_(p,duration,pdf,ref);
 props.setProperty(key,ref);
 try{
  SpreadsheetApp.openById(BRIEFING_SHEET_ID).getSheetByName(BRIEFING_SHEET_NAME)
   .getRange(registrationRow,21).setValue('COL Issued & Emailed');
 }catch(statusError){
  console.error('Registration saved and COL emailed, but status update failed: '+statusError);
 }

 return {ok:true,success:true,reference:ref,colUrl:pdf.getUrl()};
}


/**
 * Store one 22-column response in the official briefing response tab.
 * On retry, update the same IC+email row rather than creating duplicate records.
 * A pending row is retained if email dispatch subsequently fails.
 */
function saveBriefingRegistrationRow_(p,ref,receiptUrl,colUrl){
 const sheet=SpreadsheetApp.openById(BRIEFING_SHEET_ID).getSheetByName(BRIEFING_SHEET_NAME);
 if(!sheet) throw new Error('Briefing Registration sheet not found');
 const last=sheet.getLastRow();
 let row=last+1;
 if(last>1){
  const idEmails=sheet.getRange(2,4,last-1,3).getDisplayValues();
  const match=idEmails.findIndex(x=>
   String(x[0]).trim()===String(p.ic).trim() &&
   String(x[2]).trim().toLowerCase()===String(p.email).trim().toLowerCase());
  if(match>=0) row=match+2;
 }
 const existingTimestamp=row<=last?sheet.getRange(row,1).getDisplayValue():'';
 const timestamp=existingTimestamp||Utilities.formatDate(new Date(),'Asia/Kuching','dd/MM/yyyy HH:mm:ss');
 const plain=s=>{
  const v=String(s==null?'':s);
  return /^\s*=/.test(v)?"'"+v:v;
 };
 const link=(url,label)=>'=HYPERLINK("'+String(url).replace(/"/g,'""')+'","'+label+'")';
 const data=[
  timestamp,ref,plain(p.fullName),plain(p.ic),plain(p.phone),plain(p.email),
  plain(p.address),plain(p.programme),plain(p.intake),plain(p.studyMode||'Full Time'),
  plain(p.paymentMethod),'Receipt Submitted',link(receiptUrl,'View Receipt'),
  plain(p.source),plain(p.campaign),plain(p.utmSource),plain(p.utmMedium),
  plain(p.utmCampaign),plain(p.applicantType),plain(p.country),
  'COL Generated - Email Pending',link(colUrl,'View COL')
 ];
 sheet.getRange(row,2).setNumberFormat('@');
 sheet.getRange(row,4,1,2).setNumberFormat('@');
 sheet.getRange(row,1,1,22).setValues([data]);
 SpreadsheetApp.flush();
 return row;
}

function getDuration_(programme){
 const p=String(programme||'').toLowerCase();
 if(p.includes('doctor'))return '3 Years';
 if(p.includes('master'))return '1 Year';
 return '';
}

function formatAddress_(s){
 return String(s||'').replace(/,\s*/g,'\n').replace(/\n+/g,'\n').trim();
}

function json_(o){
 return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
