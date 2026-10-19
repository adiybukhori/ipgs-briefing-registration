import {createHmac} from 'node:crypto';
export const config={maxDuration:60};
export function validate(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Maklumat tidak sah.');
 const out={};const limits={fullName:150,matricId:30,phone:25,email:254,programme:150,otherProgramme:150,readiness:20,attendance:20,reason:1000,researchTitle:500,notes:1000};
 for(const [k,max] of Object.entries(limits)){if(input[k]!=null&&typeof input[k]!=='string')throw Error('Maklumat tidak sah.');out[k]=String(input[k]||'').trim();if(out[k].length>max)throw Error('Maklumat terlalu panjang.');}
 if(input.website)throw Error('Permintaan tidak sah.');
 if(!out.fullName||!out.matricId||!out.programme||!/^\+?[\d\s()\-]{7,25}$/.test(out.phone)||!/^\d{7,15}$/.test(out.phone.replace(/\D/g,''))||!/^\S+@[^\s@]+\.[^\s@]+$/.test(out.email))throw Error('Sila lengkapkan nama, matrik, program, nombor telefon dan e-mel yang sah.');
 if(!['ready','not_ready','guidance'].includes(out.readiness)||!['attend','not_attend'].includes(out.attendance)||input.rm1!==true||input.consent!==true)throw Error('Sila lengkapkan pengesahan kesediaan, kehadiran dan persetujuan.');
 if(out.attendance==='not_attend'&&!out.reason)throw Error('Sila nyatakan sebab tidak hadir.');
 if(out.programme==='Lain-lain'){if(!out.otherProgramme)throw Error('Sila nyatakan nama penuh program.');out.programme=out.otherProgramme;}
 out.email=out.email.toLowerCase();out.matricId=out.matricId.toUpperCase();out.rm1=true;out.consent=true;return out;
}
async function backend(payload){const text=JSON.stringify(payload);const signature=createHmac('sha256',process.env.COLLOQUIUM_SHARED_SECRET).update(text).digest('hex');const r=await fetch(process.env.COLLOQUIUM_BACKEND_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({payload:text,signature}),redirect:'follow',signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('Backend unavailable');return r.json();}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({message:'Method not allowed'});}
 const configured=process.env.COLLOQUIUM_BACKEND_URL&&process.env.COLLOQUIUM_SHARED_SECRET;
 if(!configured)return res.status(req.method==='GET'?200:503).json({open:false,saved:false,message:'Pendaftaran belum dibuka. Maklumat sesi tersedia untuk rujukan; borang akan dibuka selepas pengumuman IPGS.'});
 try{
  if(req.method==='GET'){const d=await backend({action:'health',timestamp:Date.now()});return res.status(200).json({open:d.open===true,message:d.open?'':'Pendaftaran belum dibuka. Sila tunggu pengumuman IPGS.'});}
  const origin=req.headers.origin;if(origin&&origin!=='https://'+req.headers.host)return res.status(403).json({saved:false,message:'Permintaan tidak dibenarkan.'});
  if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({saved:false,message:'Format tidak sah.'});
  let input;try{input=validate(req.body);}catch(e){return res.status(400).json({saved:false,message:e.message});}
  const d=await backend({action:'register',timestamp:Date.now(),input});
  if(!d.saved)return res.status(d.code==='closed'?503:400).json({saved:false,message:d.message||'Respons belum dapat disimpan.'});
  return res.status(200).json({saved:true,reference:d.reference,emailStatus:d.emailStatus,whatsappUrl:d.whatsappUrl||null,duplicate:!!d.duplicate});
 }catch{return res.status(503).json({open:false,saved:false,message:'Pengesahan belum dapat diterima. Sila cuba semula sebentar lagi menggunakan e-mel dan nombor matrik yang sama.'});}
}
