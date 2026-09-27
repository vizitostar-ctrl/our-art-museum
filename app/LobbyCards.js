"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { classes } from "./data";
import { supabase } from "./supabase";
import styles from "./Lobby.module.css";

export default function LobbyCards() {
  const [previews, setPreviews] = useState({});
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    async function load() {
      try {
        const { data, error } = await supabase.from("artworks")
          .select("class_no, student_no, parody_url, ai_url, created_at")
          .eq("status", "approved").order("created_at", { ascending: false })
          .limit(1000).abortSignal(controller.signal);
        if (error || !active) return;
        const grouped = {};
        const seen = new Set();
        for (const row of data || []) {
          if (!classes.some(c => c.id === Number(row.class_no))) continue;
          const key = `${row.class_no}:${row.student_no}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const src = row.parody_url || row.ai_url;
          if (!src || !/^https?:\/\//i.test(src)) continue;
          const list = grouped[row.class_no] ||= [];
          if (list.length < 4) list.push({ src, student: row.student_no });
        }
        setPreviews(grouped);
      } catch { /* Class navigation remains available when previews fail. */ }
      finally { clearTimeout(timeout); }
    }
    load();
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, []);
  return <div className={styles.grid}>{classes.map(classroom => {
    const images = previews[classroom.id] || [];
    return <Link href={`/class/${classroom.id}`} className={styles.card} key={classroom.id}>
      <div className={styles.cardTop}><span className={styles.flag}>{classroom.flag ? <img src={classroom.flag} alt="" /> : <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true"><path d="M2 15V1l9 2-9 5" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>}<span>{classroom.id}반</span></span><span className={styles.roomNo}>ROOM {String(classroom.id).padStart(2,"0")}</span></div>
      <div className={styles.frame}>
        {images.length ? <div className={styles.collage} data-count={images.length}>{images.map((img,i) => <div className={styles.tile} key={img.student}><img src={img.src} alt={`${classroom.name} 승인 작품 ${i+1}`} loading="lazy" decoding="async" onError={e => {e.currentTarget.style.visibility="hidden";}} /></div>)}</div> : <div className={styles.placeholder}><span className={styles.placeholderNumber}>{String(classroom.id).padStart(2,"0")}</span><span className={styles.placeholderText}>우리의 시선, 우리의 이야기</span></div>}
      </div>
      <div className={styles.cardBottom}><div><h3>{classroom.name}</h3><p>학생 작품 전시실</p></div><span className={styles.arrow} aria-hidden="true">↗</span></div>
      <span className={styles.enter}>전시실 둘러보기 <span aria-hidden="true">→</span></span>
    </Link>;
  })}</div>;
}
