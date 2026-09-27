"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Entrance.module.css";

const KEY = "our-art-museum-entered-v5";

export default function Entrance({ children }) {
  const [phase, setPhase] = useState("closed");
  const timerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const lobbyRef = useRef(null);
  const enterButtonRef = useRef(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "yes") {
        setPhase("entered");
      } else {
        enterButtonRef.current?.focus();
      }
    } catch {
      enterButtonRef.current?.focus();
    }

    let active = true;
    const preload = (src) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
    Promise.all(["/museum-entrance.png", "/sunflowers-pencil.png", "/sunflowers-oil.png"].map(preload))
      .then((loaded) => { if (active) setReady(loaded.every(Boolean)); });
    return () => { active = false; clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    if (phase === "entered") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [phase]);

  function finishEntrance() {
    clearTimeout(timerRef.current);

    try {
      sessionStorage.setItem(KEY, "yes");
    } catch {}

    setPhase("entered");

    requestAnimationFrame(() => {
      lobbyRef.current?.focus();
    });
  }

  function startEntrance() {
    if (phase !== "closed" || !ready) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishEntrance();
      return;
    }

    enterButtonRef.current?.blur();
    setPhase("opening");
    timerRef.current = setTimeout(finishEntrance, 4500);
  }

  const isOpening = phase === "opening";

  return (
    <>
      <div
        ref={lobbyRef}
        tabIndex={-1}
        inert={phase !== "entered"}
        aria-hidden={phase !== "entered"}
        className={styles.lobby}
      >
        {children}
      </div>

      {phase !== "entered" && (
        <section
          className={`${styles.entrance} ${isOpening ? styles.opening : ""}`}
          aria-label="온라인 미술관 입구"
        >
          <div className={styles.scene} aria-hidden="true">
            <div className={styles.backdrop} />

            <div className={styles.portalGlow} />

            {/* 문 안쪽 마스크 영역 */}
            <div className={styles.portalMask}>
              <div className={styles.portalInner}>
                <div className={styles.portalBaseLight} />

                <div className={styles.artwork}>
                  <img className={styles.artImage} src="/sunflowers-pencil.png" alt="" />
                  <img className={`${styles.artImage} ${styles.colorBloom}`} src="/sunflowers-oil.png" alt="" />
                  <img className={`${styles.artImage} ${styles.colorFinish}`} src="/sunflowers-oil.png" alt="" />
                </div>
              </div>
            </div>

            <div className={`${styles.door} ${styles.leftDoor}`} />
            <div className={`${styles.door} ${styles.rightDoor}`} />
            <div className={styles.seamLight} />
          </div>

          <div className={styles.shade} />

          <div className={styles.copy}>
            <p className={styles.eyebrow}>MASTERPIECE · PARODY · AI</p>
            <h1>우리들의 온라인 미술관</h1>
            <p className={styles.subtitle}>
              나의 상상에, 명화의 표현을 입히다
            </p>
          </div>

          <div className={styles.actions}>
            <button
              ref={enterButtonRef}
              type="button"
              className={styles.enterButton}
              onClick={startEntrance}
              disabled={isOpening || !ready}
            >
              {isOpening ? "전시관으로 들어가는 중…" : ready ? "전시관 입장하기 →" : "작품을 준비하고 있어요…"}
            </button>

            <p className={styles.helperText}>
              명화를 관찰하고, 패러디하고, AI로 표현을 다시 해석하다
            </p>
          </div>

          <button
            type="button"
            className={styles.skipButton}
            onClick={finishEntrance}
          >
            {isOpening ? "건너뛰기 →" : "바로 관람하기 →"}
          </button>

          <span className={styles.srOnly} role="status">
            {isOpening
              ? "문이 열리고, 문 안쪽에서 연필선이 색과 붓자국으로 변한 뒤 전시관 로비가 나타납니다."
              : ""}
          </span>
        </section>
      )}
    </>
  );
}
