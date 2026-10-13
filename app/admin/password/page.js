"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabase";
import { changeOwnPassword } from "../../lib/change-password.mjs";

const inputStyle = { display: "block", width: "100%", boxSizing: "border-box", marginTop: 8, padding: 14, border: "1px solid #d8cdbc", borderRadius: 12, background: "white", fontSize: 16 };

export default function PasswordPage() {
  const router = useRouter();
  const lock = useRef(false);
  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data?.user) { router.replace("/admin/login"); return; }
      setReady(true);
    }).catch(() => { if (active) setError("로그인 상태를 확인하지 못했습니다. 새로고침해 주세요."); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT") {
        setReady(false); setCurrent(""); setPassword(""); setConfirmation("");
        router.replace("/admin/login");
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [router]);

  async function submit(event) {
    event.preventDefault();
    if (lock.current || !ready || done) return;
    lock.current = true; setBusy(true); setError("");
    try {
      await changeOwnPassword(supabase.auth, current, password, confirmation);
      setDone(true);
    } catch (problem) {
      setError(problem?.message || "변경 결과를 확인하지 못했습니다. 다시 로그인해 확인해 주세요.");
    } finally {
      setCurrent(""); setPassword(""); setConfirmation("");
      lock.current = false; setBusy(false);
    }
  }

  return <main style={{ minHeight: "100vh", background: "#f7f2e8", padding: "40px 20px", color: "#30281f" }}>
    <section style={{ maxWidth: 480, margin: "0 auto", padding: 30, background: "#fffdfa", border: "1px solid #ddd1bf", borderRadius: 22 }}>
      <Link href="/admin">← 관리자 페이지</Link>
      <h1>비밀번호 변경</h1>
      <p style={{ lineHeight: 1.7 }}>현재 로그인한 계정의 비밀번호를 변경합니다. 이메일은 그대로 유지됩니다.</p>
      <p style={{ lineHeight: 1.7 }}>Preview에서 변경해도 운영 미술관 로그인에 동일하게 적용됩니다.</p>
      {error && <p role="alert" style={{ color: "#a43c2d" }}>{error}</p>}
      {done ? <p role="status">비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해 주세요.</p> : !ready ? <p role="status">로그인 상태를 확인하고 있습니다…</p> :
        <form onSubmit={submit}>
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
            <label style={{ display: "block", marginBottom: 20 }}>현재 비밀번호<input type="password" autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} style={inputStyle} /></label>
            <label style={{ display: "block", marginBottom: 20 }}>새 비밀번호<input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={e => setPassword(e.target.value)} aria-describedby="password-help" style={inputStyle} /></label>
            <p id="password-help">12자 이상으로 입력해 주세요. 영문·숫자·기호를 섞는 것을 권장합니다.</p>
            <label style={{ display: "block", marginBottom: 20 }}>새 비밀번호 확인<input type="password" autoComplete="new-password" required minLength={12} value={confirmation} onChange={e => setConfirmation(e.target.value)} style={inputStyle} /></label>
            <button type="submit" style={{ width: "100%", padding: 15, border: 0, borderRadius: 30, background: "#211a14", color: "white", fontSize: 16 }}>{busy ? "변경 중…" : "비밀번호 변경"}</button>
          </fieldset>
        </form>}
    </section>
  </main>;
}
