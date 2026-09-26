"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../supabase";

// 학급/학생 번호 유효 범위 (매직넘버 대신 상수로 관리)
const MIN_CLASS_NUMBER = 1;
const MAX_CLASS_NUMBER = 10;
const MIN_STUDENT_NUMBER = 1;
const MAX_STUDENT_NUMBER = 50;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function RegisterPage() {
  const params = useParams();

  const classNo = params?.classNo;
  const number = params?.number;

  const classNumber = Number(classNo);
  const studentNumber = Number(number);

  // 학생 접속 확인
  const [accessCode, setAccessCode] = useState("");
  const [accessStatus, setAccessStatus] = useState("idle");
  const [submissionState, setSubmissionState] = useState("");
  const [accessMessage, setAccessMessage] = useState("");

  // 이미지 파일
  const [originalFile, setOriginalFile] = useState(null);
  const [parodyFile, setParodyFile] = useState(null);
  const [aiFile, setAiFile] = useState(null);

  // 이미지 미리보기
  const [originalImage, setOriginalImage] = useState(null);
  const [parodyImage, setParodyImage] = useState(null);
  const [aiImage, setAiImage] = useState(null);

  // 작품 이야기
  const [originalFeature, setOriginalFeature] = useState("");
  const [expressionIntent, setExpressionIntent] = useState("");
  const [aiFeature, setAiFeature] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 언마운트 시점에도 최신 미리보기 URL을 참조하기 위한 ref
  // (아래 useEffect cleanup에서 사용)
  const previewUrlsRef = useRef({
    original: null,
    parody: null,
    ai: null,
  });

  useEffect(() => {
    previewUrlsRef.current = {
      original: originalImage,
      parody: parodyImage,
      ai: aiImage,
    };
  }, [originalImage, parodyImage, aiImage]);

  // 컴포넌트 언마운트 시 남아있는 object URL 전부 해제 (메모리 누수 방지)
  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

  const validClass =
    Number.isInteger(classNumber) &&
    classNumber >= MIN_CLASS_NUMBER &&
    classNumber <= MAX_CLASS_NUMBER;

  const validStudent =
    Number.isInteger(studentNumber) &&
    studentNumber >= MIN_STUDENT_NUMBER &&
    studentNumber <= MAX_STUDENT_NUMBER;

  const canSubmit =
    accessStatus === "allowed" &&
    (submissionState === "new" ||
      submissionState === "revision");

  const isCheckingAccess = accessStatus === "checking";

  function handleAccessCodeChange(event) {
    setAccessCode(event.target.value);

    // 접속코드를 다시 입력하면 이전 확인 결과는 취소
    setAccessStatus("idle");
    setSubmissionState("");
    setAccessMessage("");
  }

  async function handleAccessCheck() {
    if (!validClass || !validStudent) {
      alert("학급 또는 학생 번호를 확인할 수 없습니다.");
      return;
    }

    if (!accessCode.trim()) {
      alert("학생 접속코드를 입력해 주세요.");
      return;
    }

    try {
      setAccessStatus("checking");
      setAccessMessage("접속코드와 작품 상태를 확인하고 있습니다.");

      const { data, error } = await supabase.rpc(
        "get_artwork_submission_state",
        {
          p_class_no: classNumber,
          p_student_no: studentNumber,
          p_access_code: accessCode.trim(),
        }
      );

      if (error) {
        throw error;
      }

      setSubmissionState(data || "");

      if (data === "new") {
        setAccessStatus("allowed");
        setAccessMessage(
          "확인되었습니다. 처음 작품을 제출할 수 있습니다."
        );
        return;
      }

      if (data === "revision") {
        setAccessStatus("allowed");
        setAccessMessage(
          "선생님이 수정을 요청한 작품입니다. 수정한 작품을 다시 제출할 수 있습니다."
        );
        return;
      }

      if (data === "pending") {
        setAccessStatus("blocked");
        setAccessMessage(
          "이미 작품을 제출했습니다. 현재 선생님의 확인을 기다리고 있습니다."
        );
        return;
      }

      if (data === "approved") {
        setAccessStatus("blocked");
        setAccessMessage(
          "이미 승인되어 온라인 미술관에 전시 중인 작품입니다."
        );
        return;
      }

      if (data === "hidden") {
        setAccessStatus("blocked");
        setAccessMessage(
          "현재 작품을 다시 제출할 수 없습니다. 선생님께 문의해 주세요."
        );
        return;
      }

      if (data === "invalid_access") {
        setAccessStatus("error");
        setAccessMessage(
          "접속코드가 올바르지 않습니다. 다시 확인해 주세요."
        );
        return;
      }

      setAccessStatus("error");
      setAccessMessage(
        "제출 상태를 확인하지 못했습니다. 선생님께 문의해 주세요."
      );
    } catch (error) {
      console.error(error);

      setAccessStatus("error");
      setAccessMessage(
        "접속 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
      );
    }
  }

  function previewImage(
    event,
    fileSetter,
    previewSetter
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      alert(
        "JPG, PNG, WebP 형식의 이미지만 등록할 수 있습니다."
      );
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
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

  // path와 publicUrl을 함께 반환하도록 변경
  // (실패 시 롤백에는 path가 필요하고, DB 저장에는 publicUrl이 필요하기 때문)
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

    return { path: filePath, url: data.publicUrl };
  }

  // 업로드 중 하나라도 실패하면 이미 올라간 파일들을 정리
  async function rollbackUploadedFiles(paths) {
    if (paths.length === 0) return;

    try {
      await supabase.storage.from("artworks").remove(paths);
    } catch (cleanupError) {
      // 롤백 실패는 사용자 흐름을 막지 않고 로그만 남김
      console.error("업로드 롤백 실패:", cleanupError);
    }
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

    if (!canSubmit) {
      alert(
        "학생 접속코드를 먼저 확인해 주세요."
      );
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

    let uploadedPaths = [];

    try {
      setIsSubmitting(true);

      /*
        접속코드 확인과 제출 가능 상태 확인이 끝난 뒤에만
        실제 이미지 업로드를 시작합니다.

        세 이미지를 병렬로 업로드하고, 하나라도 실패하면
        이미 성공한 업로드는 storage에서 정리(rollback)합니다.
      */
      const results = await Promise.allSettled([
        uploadArtworkImage(originalFile, "original"),
        uploadArtworkImage(parodyFile, "parody"),
        uploadArtworkImage(aiFile, "ai"),
      ]);

      const succeeded = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);

      uploadedPaths = succeeded.map((r) => r.path);

      const firstFailure = results.find(
        (r) => r.status === "rejected"
      );

      if (firstFailure) {
        await rollbackUploadedFiles(uploadedPaths);
        throw firstFailure.reason;
      }

      const [originalResult, parodyResult, aiResult] = succeeded;

      /*
        직접 insert하지 않고
        안전 제출 함수 submit_artwork를 사용합니다.
      */
      const { error: submitError } =
        await supabase.rpc(
          "submit_artwork",
          {
            p_class_no: classNumber,
            p_student_no: studentNumber,
            p_access_code: accessCode.trim(),

            p_display_name:
              `2-${classNumber} ${studentNumber}번`,

            p_title:
              `2학년 ${classNumber}반 ${studentNumber}번 작품`,

            p_original_title: "",

            p_original_url: originalResult.url,
            p_parody_url: parodyResult.url,
            p_ai_url: aiResult.url,

            p_feature:
              originalFeature.trim(),

            p_intent:
              expressionIntent.trim(),

            p_prompt_text:
              aiFeature.trim(),
          }
        );

      if (submitError) {
        // DB 저장 실패 시에도 업로드된 이미지는 정리
        await rollbackUploadedFiles(uploadedPaths);

        throw new Error(
          `작품 정보 저장 실패: ${submitError.message}`
        );
      }

      setIsSubmitted(true);
      setSubmissionState("pending");
      setAccessStatus("blocked");

      setAccessMessage(
        "작품 제출이 완료되었습니다. 선생님의 확인을 기다려 주세요."
      );

      alert(
        "작품이 정상적으로 제출되었습니다.\n\n선생님의 확인 후 온라인 미술관에 전시됩니다."
      );
    } catch (error) {
      console.error(error);

      alert(
        "작품 등록 중 문제가 발생했습니다.\n\n" +
          (error?.message || "잠시 후 다시 시도해 주세요.")
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

        {/* ======================================
            STEP 00 학생 확인
            ====================================== */}
        <section className="register-section">

          <div className="register-section-title">
            <span>STEP 00</span>

            <h2>학생 확인</h2>

            <p>
              선생님에게 받은 학생 접속코드를
              입력해 주세요.
              <br />
              접속코드는 본인의 작품을 안전하게
              제출하기 위해 사용됩니다.
            </p>
          </div>

          <div
            style={{
              maxWidth: "620px",
              margin: "0 auto",
              padding: "28px",
              border: "1px solid #ddd1bf",
              borderRadius: "18px",
              background: "#fffdfa",
            }}
          >
            <label
              htmlFor="accessCode"
              style={{
                display: "block",
                marginBottom: "10px",
                fontSize: "16px",
                fontWeight: "700",
              }}
            >
              학생 접속코드
            </label>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <input
                id="accessCode"
                type="password"
                value={accessCode}
                onChange={handleAccessCodeChange}
                placeholder="접속코드를 입력하세요"
                autoComplete="off"
                disabled={isCheckingAccess}
                style={{
                  flex: "1 1 260px",
                  minWidth: 0,
                  padding: "14px 16px",
                  border: "1px solid #d5c8b6",
                  borderRadius: "12px",
                  background: isCheckingAccess
                    ? "#f3efe8"
                    : "#ffffff",
                  fontSize: "15px",
                  outline: "none",
                }}
              />

              <button
                type="button"
                onClick={handleAccessCheck}
                disabled={isCheckingAccess}
                style={{
                  border: "none",
                  borderRadius: "999px",
                  padding: "13px 22px",
                  background: "#211a14",
                  color: "#ffffff",
                  fontWeight: "700",
                  cursor: isCheckingAccess
                    ? "default"
                    : "pointer",
                  opacity: isCheckingAccess ? 0.6 : 1,
                }}
              >
                {isCheckingAccess
                  ? "확인 중..."
                  : "접속코드 확인"}
              </button>
            </div>

            <p
              style={{
                margin:
                  accessMessage
                    ? "18px 0 0"
                    : "14px 0 0",
                lineHeight: 1.7,
                color:
                  accessStatus === "allowed"
                    ? "#365a38"
                    : accessStatus === "error"
                    ? "#a33c32"
                    : "#75695d",
                fontWeight:
                  accessMessage ? "600" : "400",
              }}
            >
              {accessMessage ||
                "접속코드 확인 후 작품 등록 화면이 열립니다."}
            </p>
          </div>

        </section>

        {/* 접속 확인 성공 시에만 등록 폼 표시 */}
        {canSubmit ? (
          <form onSubmit={handleSubmit}>

            {/* ======================================
                STEP 01 작품 사진
                ====================================== */}
            <section className="register-section">

              <div className="register-section-title">
                <span>STEP 01</span>

                <h2>
                  {submissionState === "revision"
                    ? "수정 작품 사진 등록"
                    : "작품 사진 등록"}
                </h2>

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
                        <strong>
                          원작 이미지
                        </strong>
                        <span>
                          사진 선택하기
                        </span>
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
                        <strong>
                          패러디 작품
                        </strong>
                        <span>
                          사진 선택하기
                        </span>
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
                        <span>
                          사진 선택하기
                        </span>
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

            {/* ======================================
                STEP 02 작품 이야기
                ====================================== */}
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

            {/* ======================================
                최종 제출
                ====================================== */}
            <section className="register-submit">

              <span>
                READY TO EXHIBIT
              </span>

              <h2>
                {submissionState === "revision"
                  ? "수정한 작품을 다시 제출할까요?"
                  : "작품 등록을 완료했나요?"}
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
                  : submissionState === "revision"
                  ? "수정 작품 다시 제출하기"
                  : "작품 등록하기"}
              </button>

            </section>

          </form>
        ) : (
          <section className="register-submit">

            <span>
  SUBMISSION STATUS
</span>

<h2>
  {submissionState === "pending"
    ? "승인 대기 중입니다"
    : submissionState === "approved"
    ? "이미 전시 중인 작품입니다"
    : submissionState === "hidden"
    ? "현재 제출할 수 없습니다"
    : "접속코드를 확인해 주세요"}
</h2>

<p>
  {submissionState === "pending"
    ? "작품 제출이 완료되었습니다. 선생님의 확인 후 온라인 미술관에 전시됩니다."
    : submissionState === "approved"
    ? "선생님의 승인이 완료되어 온라인 미술관에 전시 중입니다."
    : submissionState === "hidden"
    ? "현재 작품을 다시 제출할 수 없습니다. 선생님께 문의해 주세요."
    : "학생 접속코드 확인이 완료되면 작품 등록 화면이 열립니다."}
</p>

          </section>
        )}

      </div>
    </main>
  );
}
