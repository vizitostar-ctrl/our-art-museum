"use client";

import { useState } from "react";
import { supabase } from "../../supabase";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage("이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(
          "로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요."
        );
        return;
      }

      window.location.href = "/admin";
    } catch (error) {
      console.error(error);
      setErrorMessage("로그인 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f2e8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 20px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "#fffdfa",
          border: "1px solid #ddd1bf",
          borderRadius: "22px",
          padding: "42px 36px",
          boxShadow: "0 18px 45px rgba(70, 55, 35, 0.08)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              letterSpacing: "0.16em",
              fontWeight: "700",
              color: "#9a7b55",
            }}
          >
            TEACHER ADMIN
          </span>

          <h1
            style={{
              margin: "12px 0 10px",
              fontSize: "32px",
              color: "#17120e",
            }}
          >
            선생님 로그인
          </h1>

          <p
            style={{
              margin: 0,
              lineHeight: 1.7,
              color: "#716659",
              fontSize: "14px",
            }}
          >
            작품 승인과 전시 관리를 위한
            <br />
            선생님 전용 페이지입니다.
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <label
            style={{
              display: "block",
              marginBottom: "20px",
              fontWeight: "700",
              color: "#30281f",
            }}
          >
            이메일

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
              placeholder="선생님 이메일"
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginTop: "8px",
                padding: "14px 15px",
                border: "1px solid #d8cdbc",
                borderRadius: "12px",
                background: "#ffffff",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </label>

          <label
            style={{
              display: "block",
              marginBottom: "18px",
              fontWeight: "700",
              color: "#30281f",
            }}
          >
            비밀번호

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
              placeholder="비밀번호"
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginTop: "8px",
                padding: "14px 15px",
                border: "1px solid #d8cdbc",
                borderRadius: "12px",
                background: "#ffffff",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </label>

          {errorMessage && (
            <p
              style={{
                padding: "12px 14px",
                margin: "0 0 18px",
                background: "#fff1ee",
                borderRadius: "10px",
                color: "#a43c2d",
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              border: "none",
              borderRadius: "999px",
              padding: "15px 20px",
              background: "#211a14",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: "700",
              cursor: isLoading ? "default" : "pointer",
              opacity: isLoading ? 0.65 : 1,
            }}
          >
            {isLoading
              ? "로그인 중..."
              : "선생님 로그인"}
          </button>
        </form>

        <p
          style={{
            margin: "24px 0 0",
            textAlign: "center",
            color: "#928577",
            fontSize: "12px",
            lineHeight: 1.6,
          }}
        >
          관리자 계정은 선생님만 사용해 주세요.
        </p>
      </section>
    </main>
  );
}
