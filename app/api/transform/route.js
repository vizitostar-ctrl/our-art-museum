import {clients,student,readBody,reserve,json,failure} from '../../learning/server';
import {makePrompt} from '../../learning/model.mjs';
export const runtime='nodejs';
export const maxDuration=180;
async function result(service,path){
 const {data,error}=await service.storage.from('museum-ai-private').download(path);if(error)throw new Error('UPSTREAM');
 return json({image:Buffer.from(await data.arrayBuffer()).toString('base64'),type:'image/jpeg'});
}
export async function POST(req){
 try{
 const body=await readBody(req,3100000);
 if(process.env.MUSEUM_AI_ENABLED!=='true'||!process.env.OPENAI_API_KEY)throw new Error('CONFIG');
 const {db,service}=clients();await student(body,db);if(!service)throw new Error('CONFIG');
 if(!body.confirmed||!['observation','intent','keep','change'].every(k=>typeof body.summary?.[k]==='string'&&body.summary[k].trim()&&body.summary[k].length<=1000)||typeof body.revision!=='string'||body.revision.length>1000)throw new Error('INPUT');
 const match=typeof body.image==='string'&&body.image.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
 if(!match)throw new Error('INPUT');const bytes=Buffer.from(match[2],'base64');if(bytes.length>2100000||bytes.length<12)throw new Error('INPUT');
 const looksValid=(match[1]==='jpeg'&&bytes[0]===255&&bytes[1]===216)||(match[1]==='png'&&bytes.subarray(1,4).toString()==='PNG')||(match[1]==='webp'&&bytes.subarray(8,12).toString()==='WEBP');if(!looksValid)throw new Error('INPUT');
 // A second transformation requires an actual revision, enforced on the server too.
 const prior=await service.from('museum_ai_jobs_v1').select('id').eq('class_no',body.classNo).eq('student_no',body.studentNo).eq('kind','image').neq('id',body.requestId);
 if(prior.error)throw new Error('CONFIG');if(prior.data.length&&!body.revision.trim())throw new Error('INPUT');
 const job=await reserve(service,body,'image');
 if(job.existing){if(job.result_path)return await result(service,job.result_path);throw new Error('BUSY');}
 const data=new FormData();data.set('model',process.env.OPENAI_IMAGE_MODEL||'gpt-image-1.5');data.set('image',new Blob([bytes],{type:`image/${match[1]}`}),`parody.${match[1]}`);data.set('prompt',makePrompt(body.summary,body.revision));data.set('n','1');data.set('size','1024x1024');data.set('quality','medium');data.set('output_format','jpeg');data.set('output_compression','85');
 const response=await fetch('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:data,signal:AbortSignal.timeout(150000)});
 if(!response.ok)throw new Error('UPSTREAM');const raw=await response.json();const b64=raw.data?.[0]?.b64_json;if(!b64)throw new Error('UPSTREAM');const image=Buffer.from(b64,'base64');if(image.length>5242880)throw new Error('UPSTREAM');
 const path=`${body.classNo}/${body.studentNo}/${body.requestId}.jpg`;
 const uploaded=await service.storage.from('museum-ai-private').upload(path,image,{contentType:'image/jpeg',upsert:false});if(uploaded.error)throw new Error('UPSTREAM');
 const saved=await service.from('museum_ai_jobs_v1').update({state:'complete',result_path:path}).eq('id',body.requestId);if(saved.error)throw new Error('UPSTREAM');
 return json({image:b64,type:'image/jpeg'});
 }catch(e){return failure(e);}
}
