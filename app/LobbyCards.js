"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { classes } from "./data";
import { supabase } from "./supabase";
import styles from "./Lobby.module.css";
const validImage = src => typeof src === "string" && /^https?:\/\//i.test(src);
export default function LobbyCards() {
 const [previews,setPreviews]=useState({}),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true;const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
  setError(false);
  async function load(){
   try{
    const [settingsResult,artworkResult]=await Promise.all([
     supabase.rpc("get_exhibition_settings_v1").abortSignal(controller.signal),
     supabase.from("artworks").select("id,class_no,student_no,parody_url,ai_url,created_at").eq("status","approved").order("created_at",{ascending:false}).order("id",{ascending:false}).limit(1000).abortSignal(controller.signal)
    ]);
    if(!active)return;
    if(settingsResult.error||artworkResult.error)throw new Error("Preview unavailable");
    const settings=settingsResult.data||[],grouped={},seen=new Set();
    for(const row of artworkResult.data||[]){
     const config=settings.find(s=>Number(s.class_no)===Number(row.class_no));
     if(!config||Number(row.student_no)>config.last_student_no)continue;
     const key=`${row.class_no}:${row.student_no}`;if(seen.has(key))continue;seen.add(key);
     const src=row.parody_url||row.ai_url;if(!validImage(src))continue;
     const list=grouped[row.class_no]||=[];if(list.length<4)list.push({src,student:row.student_no});
    }
    for(const config of settings){const chosen=config.featured.filter(row=>validImage(row.src)).map(row=>({src:row.src,student:row.student_no}));if(chosen.length)grouped[config.class_no]=chosen;}
    setPreviews(grouped);
   }catch{if(active)setError(true);}finally{clearTimeout(timeout);}
  }
  load();return()=>{active=false;clearTimeout(timeout);controller.abort();};
 },[retry]);
 return <>{error&&<p role="status">대표 이미지를 불러오지 못했습니다. 전시실은 아래에서 선택할 수 있습니다. <button onClick={()=>setRetry(n=>n+1)}>다시 불러오기</button></p>}
 <div className={styles.grid}>{classes.map(classroom=>{
  const images=previews[classroom.id]||[];
  return <Link href={`/class/${classroom.id}`} className={styles.card} key={classroom.id}>
   <div className={styles.cardTop}><span className={styles.flag}>{classroom.flag?<img src={classroom.flag} alt=""/>:<svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true"><path d="M2 15V1l9 2-9 5" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg>}<span>{classroom.id}반</span></span><span className={styles.roomNo}>ROOM {String(classroom.id).padStart(2,"0")}</span></div>
   <div className={styles.frame}>{images.length?<div className={styles.collage} data-count={images.length}>{images.map((img,i)=><div className={styles.tile} key={img.student}><img src={img.src} alt={`${classroom.name} ${img.student}번 대표 작품`} loading="lazy" decoding="async" onError={e=>{e.currentTarget.style.visibility="hidden";}}/></div>)}</div>:<div className={styles.placeholder}><span className={styles.placeholderNumber}>{String(classroom.id).padStart(2,"0")}</span><span className={styles.placeholderText}>우리의 시선, 우리의 이야기</span></div>}</div>
   <div className={styles.cardBottom}><div><h3>{classroom.name}</h3><p>학생 작품 전시실</p></div><span className={styles.arrow} aria-hidden="true">↗</span></div><span className={styles.enter}>전시실 둘러보기 <span aria-hidden="true">→</span></span>
  </Link>;
 })}</div></>;
}
