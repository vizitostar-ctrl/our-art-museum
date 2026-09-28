"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabase";
import { readAdminSession } from "../../lib/safety.mjs";
import styles from "./settings.module.css";
export default function ExhibitionSettings() {
 const router=useRouter();
 const [classNo,setClassNo]=useState(1),[config,setConfig]=useState(null),[last,setLast]=useState(32),[picks,setPicks]=useState([]);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[message,setMessage]=useState("");
 const request=useRef(0),lock=useRef(false);
 async function load(number=classNo) {
  const current=++request.current;
  setLoading(true);setError("");setMessage("");setConfig(null);
  try {
   const session=await readAdminSession(supabase);
   if(!session){router.replace("/admin/login");return;}
   const {data,error:failure}=await supabase.rpc("get_exhibition_admin_v1",{p_class_no:Number(number)});
   if(failure)throw failure;
   if(!data)throw new Error("Missing settings");
   if(current!==request.current)return;
   setConfig(data);setLast(data.last_student_no);
   const available=new Set(data.candidates.filter(row=>row.src).map(row=>row.id));
   const valid=data.featured_ids.filter(id=>available.has(id));setPicks(valid);
   if(valid.length!==data.featured_ids.length)setMessage("숨김·삭제·교체된 대표작은 선택 목록에서 제외했습니다. 확인 후 저장해 주세요.");
  }catch(e){if(current===request.current)setError(e.code==="42501"?"설정 권한이 없습니다. 기존 관리자 이메일로 04 SQL 등록을 확인해 주세요.":"설정을 불러오지 못했습니다. 연결 및 05 SQL 설치를 확인하고 다시 시도해 주세요.");}
  finally{if(current===request.current)setLoading(false);}
 }
 useEffect(()=>{load(classNo);return()=>{++request.current;};},[classNo]);
 useEffect(()=>{const {data:{subscription}}=supabase.auth.onAuthStateChange(event=>{if(event==="SIGNED_OUT"){++request.current;setConfig(null);router.replace("/admin/login");}});return()=>subscription.unsubscribe();},[]);
 function toggle(id){setMessage("");setPicks(current=>current.includes(id)?current.filter(x=>x!==id):current.length<4?[...current,id]:current);}
 async function save(){
  if(lock.current||!config)return;
  const lastNo=Number(last);
  if(!Number.isInteger(lastNo)||lastNo<1||lastNo>50){setError("마지막 학생 번호는 1~50 사이의 정수로 입력해 주세요.");return;}
  if(lastNo<config.minimum_student_no){setError(`이미 작품을 등록한 ${config.minimum_student_no}번까지는 표시해야 합니다.`);return;}
  lock.current=true;setBusy(true);setError("");setMessage("");
  try{
   const {data,error:failure}=await supabase.rpc("save_exhibition_settings_v1",{p_class_no:classNo,p_last_student_no:lastNo,p_featured_ids:picks,p_version:config.version});
   if(failure)throw failure;
   if(data===null)throw new Error("Missing confirmation");
   setConfig(current=>({...current,version:data,last_student_no:lastNo,featured_ids:[...picks]}));
   setMessage("저장했습니다. 로비나 학급 전시실을 새로 열면 반영됩니다.");
  }catch(e){setError(e.code==="40001"?"다른 창에서 설정이 변경되었거나 이전 저장이 완료됐습니다. 다시 불러온 뒤 확인해 주세요.":e.code==="22023"?"선택한 작품 상태나 학생 번호가 변경되었습니다. 다시 불러온 뒤 확인해 주세요.":"저장 결과를 확인하지 못했습니다. 다시 불러오기로 현재 설정을 먼저 확인해 주세요.");}
  finally{lock.current=false;setBusy(false);}
 }
 const chosen=config?picks.map(id=>config.candidates.find(row=>row.id===id)).filter(Boolean):[];
 return <main className={styles.page}><div className={styles.wrap}>
  <nav><Link href="/admin">← 관리자 페이지</Link><Link href="/">로비 확인</Link></nav>
  <header><span>EXHIBITION CURATION</span><h1>우리 반 전시실 설정</h1><p>학생 번호 범위와 로비에 소개할 대표 작품을 정해 주세요.</p></header>
  <div className={styles.controls}><label>학급 <select value={classNo} disabled={busy} onChange={e=>{const dirty=config&&(Number(last)!==config.last_student_no||JSON.stringify(picks)!==JSON.stringify(config.featured_ids));if(!dirty||window.confirm("저장하지 않은 선택을 두고 다른 반으로 이동할까요?"))setClassNo(Number(e.target.value));}}>{Array.from({length:10},(_,i)=><option key={i+1} value={i+1}>2학년 {i+1}반</option>)}</select></label><button disabled={busy||loading} onClick={()=>load()}>다시 불러오기</button></div>
  {error&&<p role="alert" className={styles.notice}>{error}</p>}{message&&<p role="status" className={styles.notice}>{message}</p>}
  {loading?<p role="status">설정을 확인하고 있습니다…</p>:config&&<>
   <section className={styles.panel}><h2>학생 번호 범위</h2><label>마지막 학생 번호 <input type="number" min={1} max={50} value={last} disabled={busy} onChange={e=>setLast(e.target.value)}/></label><p>1번부터 입력한 번호까지 전시실에 표시합니다. 중간 결번이 있는 경우에도 마지막 번호를 입력하세요.</p></section>
   <section className={styles.panel}><h2>대표 작품 {picks.length} / 4</h2><p>승인된 최신 작품에서 서로 다른 학생을 최대 4명 선택하세요. 선택 순서대로 로비에 배치됩니다.</p><button disabled={busy||!picks.length} onClick={()=>setPicks([])}>선택 해제 · 자동 선정으로 전환</button>
   <div className={styles.preview} aria-label="선택한 대표 작품 미리보기">{chosen.length?chosen.map(row=><img key={row.id} src={row.src} alt={`${row.student_no}번 대표작`}/>):<p>자동 선정: 최신 승인 작품 최대 4개</p>}</div>
   <div className={styles.grid}>{config.candidates.map(row=>{const index=picks.indexOf(row.id);return <button type="button" key={row.id} className={styles.card} aria-pressed={index>=0} disabled={busy||!row.src||(index<0&&picks.length>=4)} onClick={()=>toggle(row.id)}>{row.src?<img src={row.src} alt={`${row.student_no}번 패러디 또는 AI 작품`} loading="lazy"/>:<span>이미지 없음</span>}<strong>{row.student_no}번 {index>=0?`✓ 선택 ${index+1}`:""}</strong></button>;})}</div>
   {!config.candidates.length&&<p>아직 승인된 작품이 없습니다. 학생 번호 범위만 저장할 수 있습니다.</p>}
   <p>지정 작품이 숨김·삭제되거나 새 승인 작품으로 바뀌면 공개 썸네일에서 제외합니다. 유효한 지정 작품이 하나도 없으면 자동 선정으로 표시합니다.</p>
   </section><button className={styles.save} disabled={busy} onClick={save}>{busy?"저장 중…":"전시실 설정 저장"}</button>
  </>}
 </div></main>;
}
