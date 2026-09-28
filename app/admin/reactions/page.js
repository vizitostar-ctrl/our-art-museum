"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabase";
import styles from "./reactions.module.css";
import { readAdminSession } from "../../lib/safety.mjs";
const options = [["heart", "마음에 와닿아요"], ["color", "색채가 인상적이에요"], ["idea", "아이디어가 재미있어요"]];
export default function ReactionDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [classNo, setClassNo] = useState("all");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState("");
  const request = useRef(0);
  async function load() {
    const current = ++request.current;
    setBusy(true); setError(""); setRows([]);
    try {
      const session = await readAdminSession(supabase);
      if (!session) { router.replace("/admin/login"); return; }
      const { data, error: failure } = await supabase.rpc("get_admin_reaction_counts_v1");
      if (failure) throw failure;
      if (current !== request.current) return;
      setRows(Array.isArray(data) ? data : []);
      setUpdated(new Date().toLocaleTimeString("ko-KR"));
    } catch (e) {
      if (current === request.current) setError(e.code === "42501" ? "집계 열람 권한이 없습니다. SQL Editor에서 04-register-reaction-admin.sql에 관리자 이메일을 입력해 실행해 주세요." : "집계를 불러오지 못했습니다. 03-reaction-dashboard.sql 설치 및 인터넷 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally { if (current === request.current) setBusy(false); }
  }
  useEffect(() => {
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { ++request.current; setRows([]); router.replace("/admin/login"); }
    });
    return () => { ++request.current; subscription.unsubscribe(); };
  }, []);
  const filtered = rows.filter(row => classNo === "all" || Number(row.class_no) === Number(classNo));
  const totals = Object.fromEntries(options.map(([key]) => [key, filtered.reduce((n, row) => n + Number(row[key] || 0), 0)]));
  function leading(row) {
    const max = Math.max(...options.map(([key]) => Number(row[key])));
    if (!max) return "아직 반응 없음";
    const names = options.filter(([key]) => Number(row[key]) === max).map(([, label]) => label);
    return names.length === 3 ? "세 가지 감상 동일" : names.join(" · ");
  }
  return <main className={styles.page}><div className={styles.wrap}>
    <nav><Link href="/admin">← 작품 승인 관리</Link><Link href="/">전체 로비</Link></nav>
    <header><span>TEACHER ADMIN</span><h1>감상 반응 모아보기</h1><p>작품에 어떤 감상이 모였는지 살펴보세요. 학생 화면에는 가장 많이 선택된 감상만 안내합니다.</p></header>
    <div className={styles.controls}><label>반 선택 <select value={classNo} onChange={e => setClassNo(e.target.value)}><option value="all">전체 반</option>{Array.from({length:10},(_,i) => <option key={i+1} value={i+1}>2학년 {i+1}반</option>)}</select></label><button onClick={load} disabled={busy}>{busy ? "불러오는 중…" : "최신 반응 새로고침"}</button>{updated && !busy && !error && <small>최근 확인 {updated}</small>}</div>
    {error ? <p role="alert" className={styles.notice}>{error}</p> : busy ? <p role="status">감상을 모으고 있습니다…</p> : <>
    <section className={styles.summary} aria-label="선택한 반의 반응 합계"><article><span>집계 대상 작품</span><strong>{filtered.length}</strong></article>{options.map(([key,label]) => <article key={key}><span>{label}</span><strong>{totals[key]}</strong></article>)}</section>
    <p className={styles.note}>학생별 최신 승인 작품 기준 · 반/번호순 표시 · 여러 반응을 선택할 수 있어 반응 합계는 감상한 학생 수와 다릅니다.</p>
    <div className={styles.tableWrap}><table><caption>작품별 감상 반응</caption><thead><tr><th scope="col">반</th><th scope="col">번호</th>{options.map(([key,label]) => <th scope="col" key={key}>{label}</th>)}<th scope="col">가장 많이 공감한 감상</th><th scope="col">작품</th></tr></thead><tbody>{filtered.map(row => <tr key={row.artwork_id}><td>{row.class_no}반</td><td>{row.student_no}번</td>{options.map(([key]) => <td key={key}>{row[key]}</td>)}<td>{leading(row)}</td><td><Link href={`/class/${row.class_no}/student/${row.student_no}`}>보기 →</Link></td></tr>)}</tbody></table>{filtered.length === 0 && <p className={styles.notice}>이 반에는 아직 승인된 작품이 없습니다.</p>}</div>
    </>}
  </div></main>;
}
