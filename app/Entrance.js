"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Entrance.module.css";

const KEY = "our-art-museum-entered-v2";

export default function Entrance({ children }) {
  const [phase, setPhase] = useState("closed");
  const timer = useRef(null);
  const lobby = useRef(null);
  const enterButton = useRef(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "yes") {
        setPhase("entered");
      } else {
        enterButton.current?.focus();
      }
    } catch {
      enterButton.current?.focus();
    }

    return () => clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (phase === "entered") return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  function finish() {
    clearTimeout(timer.current);

    try {
      sessionStorage.setItem(KEY, "yes");
    } catch {}

    setPhase("entered");

    requestAnimationFrame(() => {
      lobby.current?.focus();
    });
  }

  function enter() {
    if (phase !== "closed") return;

    if (
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      finish();
      return;
    }

    setPhase("opening");
    timer.current = setTimeout(finish, 3000);
  }

  const isOpening = phase === "opening";

  return (
    <>
      <div
        ref={lobby}
        tabIndex={-1}
        inert={phase !== "entered" ? "" : undefined}
        aria-hidden={phase !== "entered"}
        className={styles.lobby}
      >
        {children}
      </div>

      {phase !== "entered" && (
        <section
          className={`${styles.entrance} ${
            isOpening ? styles.opening : ""
          }`}
          aria-label="온라인 미술관 입구"
        >
          <div
            className={styles.scene}
            aria-hidden="true"
          >
            <div className={styles.backdrop} />
            <div className={styles.portal} />
            <div
              className={`${styles.door} ${styles.left}`}
            />
            <div
              className={`${styles.door} ${styles.right}`}
            />
          </div>

          {/*
            1~2초 구간: 연필선 → 색 번짐 → 붓자국
            별도의 이미지 파일 없이 SVG와 CSS로 표현합니다.
          */}
          <div
            className={styles.artTransition}
            aria-hidden="true"
          >
            <div className={styles.paperGlow} />

            <svg
              className={styles.sketch}
              viewBox="0 0 1200 700"
              preserveAspectRatio="xMidYMid slice"
            >
              <path
                className={`${styles.pencilLine} ${styles.line1}`}
                d="M80 470 C180 390 260 430 330 350 C410 260 505 290 585 220 C680 140 760 180 850 120 C950 55 1055 95 1135 45"
              />
              <path
                className={`${styles.pencilLine} ${styles.line2}`}
                d="M45 575 C155 530 235 555 335 500 C445 440 545 470 635 405 C735 335 825 370 945 285 C1025 230 1095 235 1165 190"
              />
              <path
                className={`${styles.pencilLine} ${styles.line3}`}
                d="M120 180 C215 210 265 285 350 285 C450 285 490 205 585 230 C675 255 725 340 820 330 C915 320 980 250 1080 280"
              />
              <path
                className={`${styles.pencilLine} ${styles.line4}`}
                d="M210 625 C250 520 335 480 375 395 C415 305 400 220 470 135"
              />
              <path
                className={`${styles.pencilLine} ${styles.line5}`}
                d="M835 650 C795 545 745 480 770 390 C800 290 905 225 930 115"
              />
            </svg>

            <div className={`${styles.colorWash} ${styles.wash1}`} />
            <div className={`${styles.colorWash} ${styles.wash2}`} />
            <div className={`${styles.colorWash} ${styles.wash3}`} />
            <div className={`${styles.colorWash} ${styles.wash4}`} />

            <div className={`${styles.brushStroke} ${styles.brush1}`} />
            <div className={`${styles.brushStroke} ${styles.brush2}`} />
            <div className={`${styles.brushStroke} ${styles.brush3}`} />

            <div className={styles.paintBloom} />
          </div>

          <div className={styles.shade} />

          <div className={styles.copy}>
            <p className={styles.eyebrow}>
              명화 · 패러디 · AI 재해석
            </p>
            <h1>우리들의 온라인 미술관</h1>
            <p className={styles.subtitle}>
              나의 상상에, 명화의 표현을 입히다
            </p>
          </div>

          <div className={styles.actions}>
            <button
              ref={enterButton}
              className={styles.enter}
              onClick={enter}
              disabled={isOpening}
            >
              {isOpening
                ? "전시관으로 들어가는 중…"
                : "전시관 입장하기 →"}
            </button>

            <p>
              명화를 관찰하고, 나만의 작품으로 다시 만나다
            </p>
          </div>

          <button
            className={styles.skip}
            onClick={finish}
          >
            {isOpening
              ? "건너뛰기 →"
              : "바로 관람하기 →"}
          </button>

          <span
            className={styles.srOnly}
            role="status"
          >
            {isOpening
              ? "문이 열리고 연필선이 색과 붓자국으로 변한 뒤 미술관 로비가 나타납니다."
              : ""}
          </span>
        </section>
      )}
    </>
  );
}
