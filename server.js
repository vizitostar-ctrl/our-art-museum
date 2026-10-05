import { createClient } from '@supabase/supabase-js';
export function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export function clients(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon)throw new Error('CONFIG');
 const opts={auth:{persistSession:false,autoRefreshToken:false}};
 return {db:createClient(url,anon,opts),service:service?createClient(url,service,opts):null};
}
export async function student(body,db){
 const {classNo,studentNo,accessCode}=body;
 if(!Number.isInteger(classNo)||classNo<1||classNo>10||!Number.isInteger(studentNo)||studentNo<1||studentNo>50||typeof accessCode!=='string'||!accessCode.trim()||accessCode.length>100)throw new Error('ACCESS');
 const {data,error}=await db.rpc('get_artwork_submission_state',{p_class_no:classNo,p_student_no:studentNo,p_access_code:accessCode.trim()});
 if(error||!['new','revision'].includes(data))throw new Error('ACCESS');
 const roster=await db.rpc('get_exhibition_settings_v1');
 if(roster.error||!roster.data?.some(s=>s.class_no===classNo&&studentNo<=s.last_student_no))throw new Error('ACCESS');
}
export async function readBody(req,limit){
 const reader=req.body?.getReader();if(!reader)throw new Error('INPUT');
 let n=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>limit){await reader.cancel();throw new Error('INPUT');}chunks.push(Buffer.from(value));}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Error('INPUT');}
}
export async function reserve(service,body,kind){
 if(!service)throw new Error('CONFIG');
 if(typeof body.requestId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))throw new Error('INPUT');
 const limit=Number(process.env[kind==='image'?'MUSEUM_IMAGE_DAILY_LIMIT':'MUSEUM_CURATOR_DAILY_LIMIT']|| (kind==='image'?'40':'400'));
 const {data,error}=await service.rpc('reserve_museum_ai_v1',{p_id:body.requestId,p_class_no:body.classNo,p_student_no:body.studentNo,p_kind:kind,p_daily_limit:Number.isInteger(limit)?limit:0});
 if(error)throw new Error('LIMIT');return data;
}
export function failure(e){
 const msgs={ACCESS:'학생 접속코드를 다시 확인해 주세요. 제출이 끝난 작품은 선생님이 수정을 허용해야 합니다.',CONFIG:'AI 연결 설정이 아직 준비되지 않았습니다. 기본 질문과 외부용 요청문을 사용할 수 있습니다.',INPUT:'입력 내용을 확인해 주세요.',LIMIT:'사용 가능한 요청 횟수에 도달했습니다. 선생님께 알려 주세요.',BUSY:'이 요청은 처리 중이거나 결과 확인이 필요합니다. 같은 요청 확인 버튼을 눌러 주세요.'};
 return json({error:msgs[e.message]||'AI 응답을 받지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 결과를 확인하거나 선생님께 알려 주세요.'},e.message==='ACCESS'?403:e.message==='INPUT'?400:e.message==='LIMIT'?429:503);
}
