"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Entrance.module.css";

const KEY = "our-art-museum-entered-v3";

export default function Entrance({ children }) {
  const [phase, setPhase] = useState("closed");
  const timerRef = useRef(null);
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

    return () => clearTimeout(timerRef.current);
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
    if (phase !== "closed") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishEntrance();
      return;
    }

    setPhase("opening");
    timerRef.current = setTimeout(finishEntrance, 3000);
  }

  const isOpening = phase === "opening";

  return (
    <>
      <div
        ref={lobbyRef}
        tabIndex={-1}
        inert={phase !== "entered" ? "" : undefined}
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

                <div className={styles.artLayer}>
                  <svg
                    className={styles.sketch}
                    viewBox="0 0 900 1600"
                    preserveAspectRatio="xMidYMid slice"
                  >
                    <path
                      className={`${styles.pencilLine} ${styles.line1}`}
                      d="M70 1220 C170 1100 250 1130 340 1020 C420 920 500 940 590 830 C680 720 730 660 820 590"
                    />
                    <path
                      className={`${styles.pencilLine} ${styles.line2}`}
                      d="M110 980 C220 920 280 860 360 800 C450 735 520 760 620 665 C715 575 765 495 840 430"
                    />
                    <path
                      className={`${styles.pencilLine} ${styles.line3}`}
                      d="M90 760 C180 690 235 650 310 590 C390 525 500 500 590 430 C670 365 735 300 805 230"
                    />
                    <path
                      className={`${styles.pencilLine} ${styles.line4}`}
                      d="M180 1320 C210 1180 260 1065 330 940 C400 820 455 690 520 555"
                    />
                    <path
                      className={`${styles.pencilLine} ${styles.line5}`}
                      d="M665 1360 C640 1240 615 1125 645 990 C675 860 740 710 765 555"
                    />
                  </svg>

                  {/* 수채화/색 번짐 */}
                  <div className={`${styles.wash} ${styles.wash1}`} />
                  <div className={`${styles.wash} ${styles.wash2}`} />
                  <div className={`${styles.wash} ${styles.wash3}`} />
                  <div className={`${styles.wash} ${styles.wash4}`} />

                  {/* 붓자국 */}
                  <div className={`${styles.stroke} ${styles.stroke1}`}>
                    <span />
                  </div>
                  <div className={`${styles.stroke} ${styles.stroke2}`}>
                    <span />
                  </div>
                  <div className={`${styles.stroke} ${styles.stroke3}`}>
                    <span />
                  </div>

                  <div className={styles.paintMist} />
                  <div className={styles.portalFlash} />
                </div>
              </div>
            </div>

            <div className={`${styles.door} ${styles.leftDoor}`} />
            <div className={`${styles.door} ${styles.rightDoor}`} />
          </div>

          <div className={styles.shade} />

          <div className={styles.copy}>
            <p className={styles.eyebrow}>MASTERPIECE · PARODY · AI</p>
            <h1>우리들의 온라인 미술관</h1>
            <p className={styles.subtitle}>
              연필선이 색이 되고, 색이 작품이 되는 순간
            </p>
          </div>

          <div className={styles.actions}>
            <button
              ref={enterButtonRef}
              type="button"
              className={styles.enterButton}
              onClick={startEntrance}
              disabled={isOpening}
            >
              {isOpening ? "전시관으로 들어가는 중…" : "전시관 입장하기 →"}
            </button>

            <p className={styles.helperText}>
              문이 열리면, 스케치가 색과 붓자국으로 변하며 전시관이 나타납니다.
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
