'use client';
import {useState,useRef,useEffect} from 'react';
import Link from 'next/link';
import {supabase} from '../supabase';
import ArtworkReactions from '../ArtworkReactions';
import s from './Learning.module.css';
export default function PeerEncounter(){
 const dialog=useRef(null),lock=useRef(false);
 const [classNo,setClassNo]=useState(''),[studentNo,setStudentNo]=useState(''),[code,setCode]=useState(''),[art,setArt]=useState(null),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{
  const open=()=>{try{if(sessionStorage.getItem('museum-peer-opened')!=='1'){dialog.current?.showModal();sessionStorage.setItem('museum-peer-opened','1');}}catch{}};
  window.addEventListener('museum:entered',open);
  try{if(sessionStorage.getItem('our-art-museum-entered-v6')==='yes')open();}catch{}
  return()=>window.removeEventListener('museum:entered',open);
 },[]);
 async function load(){if(!classNo||lock.current)return;lock.current=true;setBusy(true);setError('');setArt(null);setBody('');setMessage('');try{const {data,error}=await supabase.rpc('get_random_peer_v1',{p_class_no:Number(classNo)});if(error)throw error;setArt(data);if(!data)setMessage('다른 반에 승인된 작품이 아직 없어요. 나중에 다시 만나 보세요.');}catch{setError('작품을 불러오지 못했습니다. 다시 시도해 주세요.');}finally{setBusy(false);lock.current=false;}}
 async function send(){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const {error}=await supabase.rpc('send_peer_feedback_v1',{p_class_no:Number(classNo),p_student_no:Number(studentNo),p_access_code:code.trim(),p_artwork_id:String(art.id),p_body:body.trim()});if(error)throw error;setCode('');setMessage('감상을 저장했어요. 선생님 확인 후 작가에게 전달됩니다.');}catch{setError('저장하지 못했습니다. 반·번호·접속코드와 연결을 확인해 주세요.');}finally{setBusy(false);lock.current=false;}}
 return <><div className={s.compact}><p>오늘은 다른 반 친구의 시선을 만나 볼까요?</p><button type="button" className={s.button} onClick={()=>dialog.current?.showModal()}>오늘의 작품 만나기</button></div>
 <dialog ref={dialog} className={s.modal} onClose={()=>setCode('')}><section className={s.panel}><div className={s.compact}><span className={s.eyebrow}>ANOTHER POINT OF VIEW</span><button type="button" className={s.secondary} onClick={()=>dialog.current.close()}>로비로 가기</button></div><h2>다른 반 친구의 작품 한 점</h2><p>내 반을 고르면 다른 반의 승인 작품을 만나요. 감상을 적게 받은 작품부터 기회를 나눕니다.</p>
 <label>나는 몇 반인가요?<select disabled={busy} value={classNo} onChange={e=>{setClassNo(e.target.value);setArt(null);setBody('');setMessage('');}}><option value="">반 선택</option>{Array.from({length:10},(_,i)=><option key={i+1} value={i+1}>{i+1}반</option>)}</select></label><button type="button" disabled={!classNo||busy} onClick={load}>작품 만나기</button>
 {error&&<p role="alert" className={s.error}>{error}</p>}<p role="status">{busy?'잠시 기다려 주세요…':message}</p>
 {art&&<><h3>{art.class_no}반의 작품</h3><img className={s.image} src={art.parody_url||art.ai_url} alt="다른 반 학생의 패러디"/><Link href={`/class/${art.class_no}/student/${art.student_no}`}>원작·패러디·AI 결과 함께 보기 →</Link><ArtworkReactions key={art.id} artworkId={art.id}/><label>어느 부분을 보고 그렇게 느꼈나요?<textarea value={body} maxLength={300} onChange={e=>setBody(e.target.value)} placeholder="내가 눈여겨본 부분은 ___이고, ___하게 느껴졌어요."/></label><p className={s.note}>감상 글은 전체 공개되지 않아요. 선생님이 확인한 뒤 작가에게 전달합니다. 같은 작품에 다시 보내면 이전 글을 수정합니다.</p><div className={s.grid}><label>내 번호<input type="number" min="1" max="50" value={studentNo} onChange={e=>setStudentNo(e.target.value)}/></label><label>내 접속코드<input type="password" autoComplete="off" value={code} onChange={e=>setCode(e.target.value)}/></label></div><button type="button" disabled={busy||!body.trim()||!code.trim()||!studentNo} onClick={send}>감상 전달하기</button></>}
 </section></dialog></>;
}
