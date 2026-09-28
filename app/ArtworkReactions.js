"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

const options = [["heart", "💗 마음에 와닿아요"], ["color", "🎨 색채가 인상적이에요"], ["idea", "💡 아이디어가 재미있어요"]];
export default function ArtworkReactions({ artworkId }) {
  const [highlights, setHighlights] = useState(null);
  const highlightRequest = useRef(0);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const visitor = useRef(null);
  const lock = useRef(false);
  const storageKey = `museum-reactions-v1:${artworkId}`;
  useEffect(() => {
    try {
      let token = localStorage.getItem("museum-visitor-v1");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token || "")) {
        token = crypto.randomUUID();
        localStorage.setItem("museum-visitor-v1", token);
      }
      visitor.current = token;
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setSelected(Array.isArray(saved) ? saved.filter(x => options.some(([key]) => key === x)) : []);
      setReady(true);
    } catch { setMessage("브라우저 저장 공간을 사용할 수 없어 반응을 보낼 수 없습니다."); }
  }, [storageKey]);
  async function loadHighlights() {
    const request = ++highlightRequest.current;
    try {
      const { data, error } = await supabase.rpc("get_artwork_reaction_highlights_v1", { p_artwork_id: String(artworkId) });
      if (request === highlightRequest.current) setHighlights(error ? null : (data || []));
    } catch { if (request === highlightRequest.current) setHighlights(null); }
  }
  useEffect(() => {
    setHighlights(null);
    loadHighlights();
    const refresh = () => { if (document.visibilityState === "visible") loadHighlights(); };
    window.addEventListener("focus", refresh);
    return () => { ++highlightRequest.current; window.removeEventListener("focus", refresh); };
  }, [artworkId]);
  async function toggle(kind) {
    if (!ready || lock.current) return;
    lock.current = true; setBusy(true); setMessage("");
    const active = !selected.includes(kind);
    try {
      const { error } = await supabase.rpc("set_artwork_reaction_v1", {
        p_artwork_id: String(artworkId), p_visitor: visitor.current,
        p_kind: kind, p_active: active,
      });
      if (error) throw error;
      const next = active ? [...selected, kind] : selected.filter(x => x !== kind);
      setSelected(next);
      void loadHighlights();
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      setMessage(active ? "감상이 전달되었습니다. 고맙습니다." : "선택한 반응을 취소했습니다.");
    } catch { setMessage("반응을 저장하지 못했습니다. 잠시 후 다시 눌러 주세요."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="reaction-section">
    <div><span className="reaction-label">ART REACTION</span><h2>이 작품에서 무엇을 발견했나요?</h2>
      <p>공감한 표현을 골라 주세요. 여러 개를 선택할 수 있으며, 다시 누르면 취소됩니다.<br />반응 수는 공개하지 않습니다.</p></div>
    {highlights !== null && <div style={{ margin: "16px auto 22px", padding: "16px", maxWidth: 650, background: "#fffaf0", border: "1px solid #ded0b6", borderRadius: 12 }}>
      <span style={{ display: "block", color: "#80643c", fontSize: 13, marginBottom: 8 }}>관람객이 가장 많이 공감한 감상</span>
      {highlights.length === 0 ? <span>아직 모인 감상이 없어요. 첫 감상을 남겨 주세요.</span>
        : highlights.length === 3 ? <strong>세 가지 감상에 고르게 공감하고 있어요.</strong>
        : <><strong>{options.filter(([key]) => highlights.includes(key)).map(([, label]) => label).join(" · ")}</strong>{highlights.length > 1 && <small style={{ display: "block", marginTop: 8 }}>두 감상에 같은 만큼 공감하고 있어요.</small>}</>}
    </div>}
    <div className="reaction-buttons">{options.map(([key,label]) => <button key={key} type="button" className="reaction-button" aria-pressed={selected.includes(key)} disabled={!ready || busy} onClick={() => toggle(key)}>{selected.includes(key) ? "✓ " : ""}{label}</button>)}</div>
    <p role="status" aria-live="polite" style={{ minHeight: "1.8em", marginBottom: 0 }}>{busy ? "감상을 전달하고 있어요…" : message}</p>
  </section>;
}
