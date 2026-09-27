"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Entrance.module.css";

const KEY = "our-art-museum-entered-v1";

export default function Entrance({ children }) {
  const [phase, setPhase] = useState("closed");
  const timer = useRef(null);
  const lobby = useRef(null);
  const enterButton = useRef(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "yes") setPhase("entered");
      else enterButton.current?.focus();
    } catch { enterButton.current?.focus(); }
    return () => clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (phase === "entered") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [phase]);

  function finish() {
    clearTimeout(timer.current);
    try { sessionStorage.setItem(KEY, "yes"); } catch {}
    setPhase("entered");
    requestAnimationFrame(() => lobby.current?.focus());
  }

  function enter() {
    if (phase !== "closed") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    setPhase("opening");
    timer.current = setTimeout(finish, 3000);
  }

  return (
    <>
      <div ref={lobby} tabIndex={-1} inert={phase !== "entered"} aria-hidden={phase !== "entered"} className={styles.lobby}>
        {children}
      </div>
      {phase !== "entered" && (
        <section className={`${styles.entrance} ${phase === "opening" ? styles.opening : ""}`} aria-label="온라인 미술관 입구">
          <div className={styles.scene} aria-hidden="true">
            <div className={styles.backdrop} />
            <div className={styles.portal} />
            <div className={`${styles.door} ${styles.left}`} />
            <div className={`${styles.door} ${styles.right}`} />
          </div>
          <div className={styles.shade} />
          <div className={styles.copy}>
            <p className={styles.eyebrow}>명화 · 패러디 · AI 재해석</p>
            <h1>우리들의 온라인 미술관</h1>
            <p className={styles.subtitle}>나의 상상에, 명화의 표현을 입히다</p>
          </div>
          <div className={styles.actions}>
            <button ref={enterButton} className={styles.enter} onClick={enter} disabled={phase === "opening"}>
              {phase === "opening" ? "전시관으로 들어가는 중…" : "전시관 입장하기 →"}
            </button>
            <p>명화를 관찰하고, 나만의 작품으로 다시 만나다</p>
          </div>
          <button className={styles.skip} onClick={finish}>
            {phase === "opening" ? "건너뛰기 →" : "바로 관람하기 →"}
          </button>
          <span className={styles.srOnly} role="status">{phase === "opening" ? "잠시 후 미술관 로비가 나타납니다." : ""}</span>
        </section>
      )}
    </>
  );
}
