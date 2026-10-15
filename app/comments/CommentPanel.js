"use client";
import { useState, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../supabase';
import styles from './comments.module.css';
export const categories={idea:'패러디 아이디어',color:'색채와 분위기',figure:'인물 표현과 구도',ai:'AI 이미지 변환으로 달라진 표현'};
const statuses={pending:'선생님 확인 중',approved:'승인 완료',rejected:'다시 작성해 주세요'};
export default function CommentPanel({artworkId,mode='write'}) {
 const [cls,setCls]=useState(''),[num,setNum]=useState(''),[code,setCode]=useState('');
 const [category,setCategory]=useState(''),[content,setContent]=useState('');
 const [items,setItems]=useState(null),[editing,setEditing]=useState(null),[limit,setLimit]=useState(1);
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 const lock=useRef(false);
 async function call(action,extra={}) {
  const {data,error}=await supabase.rpc('artwork_comments_student_v1',{p_action:action,p_class_no:Number(cls),p_student_no:Number(num),p_access_code:code,p_artwork_id:artworkId||null,...extra});
  if(error) throw new Error('연결 또는 감상평 설정을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  if(data?.error) throw new Error(data.error);
  return data;
 }
 async function run(e,action) {
  e.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setMessage('');
  try{
   if(action==='submit'){
    const result=await call(editing?'resubmit':'submit',{p_artwork_id:editing?.artwork_id||artworkId,p_category:category,p_content:content.trim(),p_comment_id:editing?.id||null,p_version:editing?.version||null});
    if(!result?.id)throw new Error('제출 결과를 확인하지 못했습니다.');
    setDone(true);setEditing(null);setContent('');setCategory('');setItems(null);setCode('');
    setMessage('감상평이 제출되었습니다. 선생님 확인 후 작품을 만든 친구에게 전달됩니다.');
   }else{const data=await call(action);setItems(data.comments);setLimit(data.limit||1);setDone(false);}
  }catch(err){setMessage(err.message+' 제출 결과가 불확실하면 다시 제출하기 전에 내가 쓴 감상평을 확인해 주세요.');}
  finally{lock.current=false;setBusy(false);}
 }
 function clearIdentity(){setItems(null);setEditing(null);setContent('');setCategory('');setDone(false);setMessage('');}
 return <section className={styles.panel}>
  <h1>{mode==='received'?'친구들이 남긴 감상평':mode==='mine'?'내가 쓴 감상평':'감상평 남기기'}</h1>
  <p>개인 코드는 본인 확인에만 사용합니다. 친구에게 작성자의 반·번호는 표시되지 않습니다.</p>
  <form onSubmit={e=>run(e,mode==='received'?'received':mode==='mine'&&!editing?'mine':'submit')}>
   <fieldset disabled={busy||done}>
    <legend>내 학생 정보 확인</legend>
    <div className={styles.identity}>
     <label>내 반<select required value={cls} onChange={e=>{setCls(e.target.value);clearIdentity();}}><option value="">선택</option>{Array.from({length:10},(_,i)=><option key={i} value={i+1}>{i+1}반</option>)}</select></label>
     <label>내 번호<input required type="number" min="1" max="50" value={num} onChange={e=>{setNum(e.target.value);clearIdentity();}}/></label>
     <label>내 개인 코드<input required type="password" maxLength={100} autoComplete="off" value={code} onChange={e=>{setCode(e.target.value);clearIdentity();}}/></label>
    </div>
    {(mode==='write'||editing)&&<>
     {editing&&<p>{editing.class_no}반 {editing.student_no}번 작품에 다시 작성합니다. 사유: {editing.rejection_reason}</p>}
     <label>① 어떤 점이 인상 깊었나요?<select required value={category} onChange={e=>setCategory(e.target.value)}><option value="">하나를 선택해 주세요</option>{Object.entries(categories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
     <label>② 왜 그렇게 생각했나요?<p>이 작품에서 인상 깊었던 표현과 그렇게 생각한 이유를 적어 주세요. 작품을 평가하기보다 자신의 느낌과 생각을 표현해 주세요.</p>
     <textarea required minLength={10} maxLength={300} rows={5} value={content} onChange={e=>setContent(e.target.value)} placeholder="원작의 인물 구도를 새로운 캐릭터로 표현한 점이 흥미로웠어요. 파란색 배경과 노란색 인물이 대비되어 눈에 잘 들어왔어요."/></label>
     <p>{Array.from(content).length} / 300자 · 30~150자 권장, 10~300자 입력</p>
     <p>이름·연락처 등 개인정보는 적지 마세요. 다른 반 친구의 작품에만 작성할 수 있습니다.</p>
    </>}
    <button type="submit">{busy?'확인 중…':mode==='received'?'내가 받은 감상평 확인':mode==='mine'&&!editing?'내가 쓴 감상평 확인':editing?'수정해서 다시 제출':'선생님께 감상평 제출'}</button>
   </fieldset>
  </form>
  {message&&<p role="status" className={styles.notice}>{message}</p>}
  {done&&<button onClick={()=>{setDone(false);setMessage('');}}>확인 완료</button>}
  {items&&<div aria-live="polite">
   {mode==='mine'&&<p>작성 {items.length} / 허용 {limit}개 · 반려된 글은 아래에서 다시 작성할 수 있습니다.</p>}
   {!items.length&&<p>{mode==='received'?'아직 도착한 감상평이 없습니다.':'아직 작성한 감상평이 없습니다.'}</p>}
   {items.map(item=><article key={item.id} className={styles.card}>
    <h2>{categories[item.category]}</h2><p className={styles.body}>{item.content}</p>
    {mode==='mine'&&<><p>{item.class_no}반 {item.student_no}번 작품 · {statuses[item.status]}</p>{item.status==='rejected'&&<><p>반려 사유: {item.rejection_reason}</p><button disabled={busy} onClick={()=>{setEditing(item);setCategory(item.category);setContent(item.content);setMessage('위 입력창에서 수정한 뒤 다시 제출해 주세요.');}}>이 감상평 다시 작성</button></>}</>}
   </article>)}
   {mode==='received'&&<p className={styles.notice}>나는 내 작품을 이렇게 표현하려고 했는데, 친구의 감상평을 읽어 보니 어떤 점이 비슷하거나 달랐나요?</p>}
   <button disabled={busy} onClick={()=>{setItems(null);setCode('');setEditing(null);setContent('');setCategory('');}}>감상평 닫기 · 코드 지우기</button>
  </div>}
  <nav className={styles.nav}><Link href="/comments?mode=mine">내가 쓴 감상평 · 반려 확인</Link><Link href="/">미술관 로비</Link></nav>
 </section>;
}
