const ROOT_FOLDER_ID='1vUYgkLM9NjZTjJKP1CHegrx8Zd1cE1_0';
const TEMPLATE_DOC_ID='1q9cji_T_XDa5OMM5u_S0UYrQviX8h8H0iAZL9MKj7ec';
const REGISTRATION_LINK='https://ipgs-admission-form.innovative.edu.my/';
const CC_EMAILS=['adiybukhori.ipgs@innovative.edu.my','saiful.nizam@innovative.edu.my','khidir.hazidi@innovative.edu.my','nazrin.rahim@innovative.edu.my','ikram.jasmi@innovative.edu.my'].join(',');

function doPost(e){
 try{
  const p=JSON.parse(e.postData.contents||'{}');
  if(p.action==='lead') return json_({ok:true,leadId:'IPGS-'+Date.now().toString().slice(-8)});
  if(p.action!=='complete') throw new Error('Invalid action');
  const lock=LockService.getScriptLock(); lock.waitLock(15000);
  try{return json_(completeRegistration_(p));} finally{lock.releaseLock();}
 }catch(err){return json_({ok:false,error:String(err.message||err)});}
}
function completeRegistration_(p){
 ['fullName','ic','phone','email','address','programme','intake','paymentMethod','receiptBase64','receiptName'].forEach(k=>{if(!p[k])throw new Error('Missing '+k)});
 const props=PropertiesService.getScriptProperties();
 const key='DONE_'+String(p.email).toLowerCase()+'_'+p.ic;
 const old=props.getProperty(key); if(old)return {ok:true,reference:old,duplicate:true};
 const ref='IPGS-'+Date.now().toString().slice(-8);
 const root=DriveApp.getFolderById(ROOT_FOLDER_ID); const safe=String(p.fullName).replace(/[^A-Za-z0-9_-]+/g,'_');
 const folder=root.createFolder(safe+'_'+p.ic); const docs=folder.createFolder('01_Application_Documents'); const offers=folder.createFolder('02_Offer_Letter');
 const bytes=Utilities.base64Decode(String(p.receiptBase64).replace(/^data:[^,]+,/,''));
 docs.createFile(Utilities.newBlob(bytes,p.receiptMime||'application/octet-stream','PAYMENT_RECEIPT_'+p.receiptName));
 const duration=getDuration_(p.programme); const issueDate=Utilities.formatDate(new Date(),'GMT+8','dd MMMM yyyy');
 const copy=DriveApp.getFileById(TEMPLATE_DOC_ID).makeCopy('TEMP_COL_'+safe,offers); const doc=DocumentApp.openById(copy.getId()); const body=doc.getBody();
 const map={'{{FULL_NAME}}':p.fullName,'{{IC}}':p.ic,'{{PERMANENT_ADDRESS}}':formatAddress_(p.address),'{{PROGRAM}}':p.programme,'{{STUDY_MODE}}':'Full Time','{{PROGRAMME_DURATION}}':duration,'{{INTAKE}}':p.intake,'{{DATE_ISSUED}}':issueDate};
 Object.keys(map).forEach(k=>body.replaceText(k,map[k]||'')); doc.saveAndClose();
 const pdf=offers.createFile(copy.getAs(MimeType.PDF)).setName('COL_'+safe+'_'+p.ic+'.pdf'); copy.setTrashed(true);
 sendColEmail_(p,duration,pdf,ref); props.setProperty(key,ref);
 return {ok:true,reference:ref,colUrl:pdf.getUrl()};
}
function getDuration_(programme){const p=String(programme||'').toLowerCase();if(p.includes('doctor'))return '3 Years';if(p.includes('master'))return '1 Year';return '';}
function formatAddress_(s){return String(s||'').replace(/,\s*/g,'\n').replace(/\n+/g,'\n').trim();}
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
