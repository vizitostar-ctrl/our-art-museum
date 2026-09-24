"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [originalImage, setOriginalImage] = useState(null);
  const [parodyImage, setParodyImage] = useState(null);
  const [aiImage, setAiImage] = useState(null);

  const [originalFeature, setOriginalFeature] = useState("");
  const [expressionIntent, setExpressionIntent] = useState("");
  const [aiFeature, setAiFeature] = useState("");

  function previewImage(event, setter) {
    const file = event.target.files?.[0];

    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setter(imageUrl);
  }

  function handleSubmit(event) {
    event.preventDefault();

    alert(
      "지금은 등록 화면을 시험하는 단계입니다.\n다음 단계에서 실제 저장 기능을 연결합니다."
    );
  }

  return (
    <main className="register-page">
      <div className="register-inner">

        <header className="register-header">
          <Link href="../" className="backButton">
            ← 작품으로 돌아가기
          </Link>

          <span className="register-label">
            STUDENT ARTWORK REGISTRATION
          </span>

          <h1>내 작품 전시하기</h1>

          <p>
            작품 사진과 작품 이야기를 등록해 주세요.
            <br />
            등록한 내용은 선생님의 확인 후 전시됩니다.
          </p>
        </header>

        <form onSubmit={handleSubmit}>

          <section className="register-section">
            <div className="register-section-title">
              <span>STEP 01</span>
              <h2>작품 사진 등록</h2>
              <p>
                가로·세로 작품 모두 등록할 수 있습니다.
                작품 전체가 잘 보이도록 촬영한 사진을 선택해 주세요.
              </p>
            </div>

            <div className="upload-grid">

              {/* 원작 */}
              <article className="upload-card">
                <div className="upload-heading">
                  <span>01</span>
                  <h3>원작</h3>
                </div>

                <label className="upload-box">
                  {originalImage ? (
                    <img
                      src={originalImage}
                      alt="원작 미리보기"
                      className="upload-preview"
                    />
                  ) : (
                    <div className="upload-empty">
                      <strong>원작 이미지</strong>
                      <span>사진 선택하기</span>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      previewImage(event, setOriginalImage)
                    }
                  />
                </label>

                <p className="upload-help">
                  원작 이미지를 등록해 주세요.
                </p>
              </article>

              {/* 패러디 작품 */}
              <article className="upload-card">
                <div className="upload-heading">
                  <span>02</span>
                  <h3>나의 패러디</h3>
                </div>

                <label className="upload-box">
                  {parodyImage ? (
                    <img
                      src={parodyImage}
                      alt="패러디 작품 미리보기"
                      className="upload-preview"
                    />
                  ) : (
                    <div className="upload-empty">
                      <strong>패러디 작품</strong>
                      <span>사진 선택하기</span>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      previewImage(event, setParodyImage)
                    }
                  />
                </label>

                <p className="upload-help">
                  직접 제작한 패러디 작품을 등록해 주세요.
                </p>
              </article>

              {/* AI 작품 */}
              <article className="upload-card">
                <div className="upload-heading">
                  <span>03</span>
                  <h3>AI 재해석</h3>
                </div>

                <label className="upload-box">
                  {aiImage ? (
                    <img
                      src={aiImage}
                      alt="AI 재해석 작품 미리보기"
                      className="upload-preview"
                    />
                  ) : (
                    <div className="upload-empty">
                      <strong>AI 재해석 작품</strong>
                      <span>사진 선택하기</span>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      previewImage(event, setAiImage)
                    }
                  />
                </label>

                <p className="upload-help">
                  AI를 활용해 재해석한 이미지를 등록해 주세요.
                </p>
              </article>

            </div>
          </section>

          <section className="register-section">

            <div className="register-section-title">
              <span>STEP 02</span>
              <h2>작품 이야기 작성</h2>
              <p>
                작품을 만들면서 관찰하고 생각한 내용을
                자신의 말로 작성해 주세요.
              </p>
            </div>

            <div className="writing-grid">

              <article className="writing-card">
                <span className="writing-number">01</span>

                <label htmlFor="originalFeature">
                  원작에서 발견한 특징
                </label>

                <p>
                  원작의 색채, 붓질, 질감, 화면 구성 등에서
                  발견한 특징을 작성해 주세요.
                </p>

                <textarea
                  id="originalFeature"
                  value={originalFeature}
                  onChange={(event) =>
                    setOriginalFeature(event.target.value)
                  }
                  maxLength={300}
                  placeholder="예: 밝은 색과 어두운 색의 대비가 강하고, 짧고 반복적인 붓질이 보였습니다."
                />

                <span className="character-count">
                  {originalFeature.length} / 300
                </span>
              </article>

              <article className="writing-card">
                <span className="writing-number">02</span>

                <label htmlFor="expressionIntent">
                  나의 표현 의도
                </label>

                <p>
                  패러디하면서 무엇을 바꾸었고,
                  어떤 생각을 표현했는지 작성해 주세요.
                </p>

                <textarea
                  id="expressionIntent"
                  value={expressionIntent}
                  onChange={(event) =>
                    setExpressionIntent(event.target.value)
                  }
                  maxLength={300}
                  placeholder="예: 원작의 인물은 유지하면서 배경을 학교생활과 관련된 장면으로 바꾸었습니다."
                />

                <span className="character-count">
                  {expressionIntent.length} / 300
                </span>
              </article>

              <article className="writing-card">
                <span className="writing-number">03</span>

                <label htmlFor="aiFeature">
                  AI에게 전달한 표현 특징
                </label>

                <p>
                  AI 이미지 제작을 위해 전달한 색채,
                  붓질, 질감 등의 표현 특징을 작성해 주세요.
                </p>

                <textarea
                  id="aiFeature"
                  value={aiFeature}
                  onChange={(event) =>
                    setAiFeature(event.target.value)
                  }
                  maxLength={500}
                  placeholder="예: 선명한 색의 대비, 짧게 반복되는 붓질, 두껍고 거친 질감이 느껴지도록 표현해 주세요."
                />

                <span className="character-count">
                  {aiFeature.length} / 500
                </span>
              </article>

            </div>
          </section>

          <section className="register-submit">
            <span>READY TO EXHIBIT</span>
            <h2>작품 등록을 완료했나요?</h2>

            <p>
              사진과 설명을 다시 한번 확인해 주세요.
              <br />
              실제 전시 공개는 선생님의 확인 후 이루어집니다.
            </p>

            <button type="submit" className="submit-artwork-button">
              작품 등록하기
            </button>
          </section>

        </form>

      </div>
    </main>
  );
}
