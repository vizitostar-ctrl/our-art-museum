import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
export async function createFixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table public.student_access(id uuid primary key,class_no integer,student_no integer,active boolean,access_code_hash text);
 create table public.artworks(id uuid primary key,class_no integer,student_no integer,status text);
 create table public.exhibition_settings_v1(class_no integer,last_student_no integer);
 create table public.reaction_admins_v1(user_id uuid);
 create function public.verify_student_access(p_class_no integer,p_student_no integer,p_access_code text) returns boolean language sql security definer set search_path='' as $$ select exists(select 1 from public.student_access where class_no=p_class_no and student_no=p_student_no and active and access_code_hash=encode(sha256(convert_to(trim(upper(p_access_code)),'UTF8')),'hex')) $$;
 insert into public.exhibition_settings_v1 values(1,32),(2,32),(3,32);
 insert into public.student_access select ('00000000-0000-4000-8000-00000000000'||i)::uuid,i,1,true,encode(sha256(convert_to('TEST-'||i,'UTF8')),'hex') from generate_series(1,3)i;
 insert into public.artworks select ('10000000-0000-4000-8000-00000000000'||i)::uuid,i,1,'approved' from generate_series(1,3)i;
 insert into public.reaction_admins_v1 values('20000000-0000-4000-8000-000000000001');
 `);
 await db.exec(await readFile(new URL('../../database/comments-v1.sql',import.meta.url),'utf8'));
 return db;
}
export const artwork=i=>`10000000-0000-4000-8000-00000000000${i}`;
export async function student(db,action,cls,extra={}){
 await db.exec('set role anon');
 try{return (await db.query('select public.artwork_comments_student_v1($1,$2,1,$3,$4,$5,$6,$7,$8) result',[action,cls,extra.code??`TEST-${cls}`,extra.artwork??artwork(2),extra.category??'idea',extra.content??'색채의 대비와 새로운 구도가 인상적이었어요.',extra.id??null,extra.version??null])).rows[0].result;}finally{await db.exec('reset role');}
}
export async function admin(db,action,extra={}){
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${extra.uid??'20000000-0000-4000-8000-000000000001'}'`);
 try{return (await db.query('select public.artwork_comments_admin_v1($1,$2,$3,$4,$5,$6,$7) result',[action,extra.id??null,extra.status??null,extra.reason??null,extra.version??null,extra.limit??null,extra.page??0])).rows[0].result;}finally{await db.exec('reset role');}
}
async function test(){
 const db=await createFixture();let checks=0;const ok=(v)=>{assert(v);checks++;};
 ok((await student(db,'submit',1,{code:'wrong'})).error);
 ok((await student(db,'submit',1,{content:'짧다'})).error);
 ok((await student(db,'submit',1,{content:'가'.repeat(301)})).error);
 ok((await student(db,'submit',1,{artwork:artwork(1)})).error);
 ok((await student(db,'submit',1,{category:'forged'})).error);
 await db.exec("insert into public.artworks values('10000000-0000-4000-8000-000000000004',1,2,'approved'),('10000000-0000-4000-8000-000000000005',3,2,'pending')");
 ok((await student(db,'submit',1,{artwork:artwork(4)})).error);
 ok((await student(db,'submit',1,{artwork:artwork(5)})).error);
 const sent=await student(db,'submit',1);ok(sent.id);
 ok((await student(db,'submit',1)).error);
 ok((await student(db,'submit',1,{artwork:artwork(3)})).error);
 assert.deepEqual((await student(db,'received',2)).comments,[]);checks++;
 ok((await student(db,'received',3)).error);
 const list=await admin(db,'list');ok(list.comments[0].author_class===1);ok(list.students.find(s=>s.class_no===1).submitted===1);
 await assert.rejects(admin(db,'list',{uid:'20000000-0000-4000-8000-000000000002'}));checks++;
 await admin(db,'review',{id:sent.id,status:'rejected',reason:'어떤 색인지 구체적으로 적어 주세요.',version:1});
 const mine=(await student(db,'mine',1)).comments[0];ok(mine.rejection_reason);ok(mine.status==='rejected');
 ok((await student(db,'resubmit',3,{id:sent.id,version:2})).error);
 ok((await student(db,'resubmit',1,{id:sent.id,version:1})).error);
 ok((await student(db,'resubmit',1,{id:sent.id,version:2,content:'파란 배경과 노란 인물이 서로 돋보이게 느껴졌어요.'})).id===sent.id);
 await assert.rejects(admin(db,'review',{id:sent.id,status:'approved',version:2}));checks++;
 await admin(db,'review',{id:sent.id,status:'approved',version:3});
 const received=(await student(db,'received',2)).comments;ok(received.length===1);
 assert.deepEqual(Object.keys(received[0]).sort(),['category','content','id']);checks++;
 await admin(db,'review',{id:sent.id,status:'hidden',reason:'개인정보 확인 필요',version:4});
 ok((await student(db,'received',2)).comments.length===0);
 await admin(db,'settings',{limit:2});
 ok((await student(db,'submit',1,{artwork:artwork(3)})).id);
 ok((await admin(db,'list',{id:artwork(2)})).total===1);
 await db.exec('set role anon');await assert.rejects(db.query('select * from public.artwork_comments'));await db.exec('reset role');checks++;
 await db.exec('set role authenticated');await assert.rejects(db.query("update public.artwork_comments set content='tampered text'") );await db.exec('reset role');checks++;
 // Authentication failures are returned (not rolled back), preventing rapid guesses.
 for(let i=0;i<21;i++)await student(db,'mine',3,{code:'bad'});
 ok((await student(db,'mine',3)).error.includes('1분'));
 ok((await db.query('select count(*)::int n from public.artworks')).rows[0].n===5);
 ok((await db.query('select count(*)::int n from public.student_access')).rows[0].n===3);
 console.log(`PASS ${checks} database checks: identity, quota, moderation, anonymity, resubmission, stale review, RLS/grants, throttling, original rows preserved.`);
 await db.close();
}
if(process.argv[1]?.endsWith('comments-db.test.mjs')) await test();
