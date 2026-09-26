"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../supabase";

export default function RegisterPage() {
  const params = useParams();

  const classNo = params?.classNo;
  const number = params?.number;

  const classNumber = Number(classNo);
  const studentNumber = Number(number);

  const [originalFile, setOriginalFile] = useState(null);
  const [parodyFile, setParodyFile] = useState(null);
  const [aiFile, setAiFile] = useState(null);

  const [originalImage, setOriginalImage] = useState(null);
  const [parodyImage, setParodyImage] = useState(null);
  const [aiImage, setAiImage] = useState(null);

  const [originalFeature, setOriginalFeature] = useState("");
  const [expressionIntent, setExpressionIntent] = useState("");
  const [aiFeature, setAiFeature] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  const maxFileSize = 5 * 1024 * 1024;

  const validClass =
    Number.isInteger(classNumber) &&
    classNumber >= 1 &&
    classNumber <= 10;

  const validStudent =
    Number.isInteger(studentNumber) &&
    studentNumber >= 1 &&
    studentNumber <= 50;

  function previewImage(
    event,
    fileSetter,
    previewSetter
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!allowedTypes.includes(file.type)) {
      alert(
        "JPG, PNG, WebP 형식의 이미지만 등록할 수 있습니다."
      );
      event.target.value = "";
      return;
    }

    if (file.size > maxFileSize) {
      alert(
        "이미지 한 장의 용량은 5MB 이하로 등록해 주세요."
      );
      event.target.value = "";
      return;
    }

    fileSetter(file);

    previewSetter((currentImage) => {
      if (currentImage) {
        URL.revokeObjectURL(currentImage);
      }

      return URL.createObjectURL(file);
    });
  }

  function getFileExtension(file) {
    if (file.type === "image/jpeg") return "jpg";
    if (file.type === "image/png") return "png";
    if (file.type === "image/webp") return "webp";

    return "jpg";
  }

  function makeUniqueId() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }

  async function uploadArtworkImage(
    file,
    imageType
  ) {
    const extension = getFileExtension(file);

    const filePath =
      `class-${classNumber}/student-${studentNumber}/` +
      `${Date.now()}-${makeUniqueId()}-${imageType}.${extension}`;

    const { error: uploadError } =
      await supabase.storage
        .from("artworks")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

    if (uploadError) {
      throw new Error(
        `${imageType} 이미지 업로드 실패: ${uploadError.message}`
      );
    }

    const { data } = supabase.storage
      .from("artworks")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting || isSubmitted) return;

    if (!validClass) {
      alert("학급 번호를 확인할 수 없습니다.");
      return;
    }

    if (!validStudent) {
      alert("학생 번호를 확인할 수 없습니다.");
      return;
    }

    if (
      !originalFile ||
      !parodyFile ||
      !aiFile
    ) {
      alert(
        "원작, 나의 패러디, AI 재해석 이미지를 모두 등록해 주세요."
      );
      return;
    }

    if (
      !originalFeature.trim() ||
      !expressionIntent.trim() ||
      !aiFeature.trim()
    ) {
      alert(
        "작품 이야기 세 항목을 모두 작성해 주세요."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const originalUrl =
        await uploadArtworkImage(
          originalFile,
          "original"
        );

      const parodyUrl =
        await uploadArtworkImage(
          parodyFile,
          "parody"
        );

      const aiUrl =
        await uploadArtworkImage(
          aiFile,
          "ai"
        );

      const { error: insertError } =
        await supabase
          .from("artworks")
          .insert({
            class_no: classNumber,
            student_no: studentNumber,

            display_name:
              `2-${classNumber} ${studentNumber}번`,

            title:
              `2학년 ${classNumber}반 ${studentNumber}번 작품`,

            original_url: originalUrl,
            parody_url: parodyUrl,
            ai_url: aiUrl,

            feature:
              originalFeature.trim(),

            intent:
              expressionIntent.trim(),

            prompt_text:
              aiFeature.trim(),

            status: "pending",
          });

      if (insertError) {
        throw new Error(
          `작품 정보 저장 실패: ${insertError.message}`
        );
      }

      setIsSubmitted(true);

      alert(
        "작품이 정상적으로 제출되었습니다.\n\n선생님의 확인 후 온라인 미술관에 전시됩니다."
      );
    } catch (error) {
      console.error(error);

      alert(
        "작품 등록 중 문제가 발생했습니다.\n\n" +
          error.message
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!validClass || !validStudent) {
    return (
      <main className="register-page">
        <div className="register-inner">
          <section className="register-submit">
            <span>INVALID ADDRESS</span>

            <h2>
              학급 또는 학생 번호를 확인해 주세요.
            </h2>

            <p>
              올바른 전시실에서 다시 접속해 주세요.
            </p>

            <Link
              href="/"
              className="backButton"
            >
              ← 미술관 로비
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="register-page">
      <div className="register-inner">

        <header className="register-header">
          <Link
            href={`/class/${classNumber}/student/${studentNumber}`}
            className="backButton"
          >
            ← 작품으로 돌아가기
          </Link>

          <span className="register-label">
            STUDENT ARTWORK REGISTRATION
          </span>

          <h1>내 작품 전시하기</h1>

          <p>
            2학년 {classNumber}반{" "}
            {studentNumber}번 작품을 등록합니다.
            <br />
            등록한 내용은 선생님의 확인 후
            전시됩니다.
          </p>
        </header>

        <form onSubmit={handleSubmit}>

          <section className="register-section">

            <div className="register-section-title">
              <span>STEP 01</span>

              <h2>작품 사진 등록</h2>

              <p>
                가로·세로 작품 모두 등록할 수 있습니다.
                작품 전체가 잘 보이도록 촬영한 사진을
                선택해 주세요.
              </p>
            </div>

            <div className="upload-grid">

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
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      previewImage(
                        event,
                        setOriginalFile,
                        setOriginalImage
                      )
                    }
                  />

                </label>

                <p className="upload-help">
                  원작 이미지를 등록해 주세요.
                </p>

              </article>

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
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      previewImage(
                        event,
                        setParodyFile,
                        setParodyImage
                      )
                    }
                  />

                </label>

                <p className="upload-help">
                  직접 제작한 패러디 작품을
                  등록해 주세요.
                </p>

              </article>

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
                      <strong>
                        AI 재해석 작품
                      </strong>
                      <span>사진 선택하기</span>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      previewImage(
                        event,
                        setAiFile,
                        setAiImage
                      )
                    }
                  />

                </label>

                <p className="upload-help">
                  AI를 활용해 재해석한 이미지를
                  등록해 주세요.
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

                <span className="writing-number">
                  01
                </span>

                <label htmlFor="originalFeature">
                  원작에서 발견한 특징
                </label>

                <p>
                  원작의 색채, 붓질, 질감,
                  화면 구성 등에서 발견한 특징을
                  작성해 주세요.
                </p>

                <textarea
                  id="originalFeature"
                  value={originalFeature}
                  onChange={(event) =>
                    setOriginalFeature(
                      event.target.value
                    )
                  }
                  maxLength={300}
                  placeholder="예: 밝은 색과 어두운 색의 대비가 강하고, 짧고 반복적인 붓질이 보였습니다."
                />

                <span className="character-count">
                  {originalFeature.length} / 300
                </span>

              </article>

              <article className="writing-card">

                <span className="writing-number">
                  02
                </span>

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
                    setExpressionIntent(
                      event.target.value
                    )
                  }
                  maxLength={300}
                  placeholder="예: 원작의 인물은 유지하면서 배경을 학교생활과 관련된 장면으로 바꾸었습니다."
                />

                <span className="character-count">
                  {expressionIntent.length} / 300
                </span>

              </article>

              <article className="writing-card">

                <span className="writing-number">
                  03
                </span>

                <label htmlFor="aiFeature">
                  AI에게 전달한 표현 특징
                </label>

                <p>
                  AI 이미지 제작을 위해 전달한
                  색채, 붓질, 질감 등의 표현 특징을
                  작성해 주세요.
                </p>

                <textarea
                  id="aiFeature"
                  value={aiFeature}
                  onChange={(event) =>
                    setAiFeature(
                      event.target.value
                    )
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

            <span>
              READY TO EXHIBIT
            </span>

            <h2>
              작품 등록을 완료했나요?
            </h2>

            <p>
              사진과 설명을 다시 한번
              확인해 주세요.
              <br />
              실제 전시 공개는 선생님의 확인 후
              이루어집니다.
            </p>

            <button
              type="submit"
              className="submit-artwork-button"
              disabled={
                isSubmitting ||
                isSubmitted
              }
            >
              {isSubmitting
                ? "작품 등록 중..."
                : isSubmitted
                ? "작품 제출 완료"
                : "작품 등록하기"}
            </button>

          </section>

        </form>

      </div>
    </main>
  );
}
