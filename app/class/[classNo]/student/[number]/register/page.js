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
const IMAGE_LABELS = {original:"원작",parody:"나의 패러디",ai:"AI 재해석"};

export default function RegisterPage() {
  const params = useParams();

  const classNo = params?.classNo;
  const number = params?.number;

  const classNumber = Number(classNo);
  const studentNumber = Number(number);

  const [lastStudent, setLastStudent] = useState(null);
  const [settingsError, setSettingsError] = useState("");
  const submitLock = useRef(false);
  const uploadedFilesRef = useRef({}); // Uploads already confirmed during this page visit.
  useEffect(() => {
    let active = true;
    setLastStudent(null); setSettingsError("");
    supabase.rpc("get_exhibition_settings_v1").then(({ data, error }) => {
      if (!active) return;
      const config = data?.find(row => Number(row.class_no) === classNumber);
      if (error || !config) setSettingsError("학급 설정을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.");
      else setLastStudent(config.last_student_no);
    }).catch(() => { if (active) setSettingsError("연결을 확인한 뒤 새로고침해 주세요."); });
    return () => { active = false; };
  }, [classNumber]);

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
  const [aiReflection, setAiReflection] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [previewErrors, setPreviewErrors] = useState({});

  // Release old preview URLs after React replaces their images, not in setState.
  const previewUrlsRef = useRef({original:null,parody:null,ai:null});
  useEffect(() => () => { if (originalImage) URL.revokeObjectURL(originalImage); },[originalImage]);
  useEffect(() => () => { if (parodyImage) URL.revokeObjectURL(parodyImage); },[parodyImage]);
  useEffect(() => () => { if (aiImage) URL.revokeObjectURL(aiImage); },[aiImage]);

  const validClass =
    Number.isInteger(classNumber) &&
    classNumber >= MIN_CLASS_NUMBER &&
    classNumber <= MAX_CLASS_NUMBER;

  const validStudent =
    Number.isInteger(studentNumber) &&
    studentNumber >= MIN_STUDENT_NUMBER &&
    studentNumber <= MAX_STUDENT_NUMBER &&
    lastStudent !== null && studentNumber <= lastStudent;

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

  function previewImage(event,fileSetter,previewSetter,imageType) {
    const file=event.target.files?.[0];
    if(!file || submitLock.current) return;
    event.target.value=""; // Same photo may be selected again after an error.
    if(!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      alert("JPG, PNG, WebP 형식의 이미지만 등록할 수 있습니다.");
      return;
    }
    if(file.size===0 || file.size>MAX_FILE_SIZE) {
      alert("사진 한 장은 0바이트보다 크고 5MB 이하여야 합니다.");
      return;
    }
    try {
      const url=URL.createObjectURL(file);
      previewUrlsRef.current[imageType]=url;
      uploadedFilesRef.current[imageType]=null;
      fileSetter(file);
      previewSetter(url);
      setPreviewErrors(old=>({...old,[imageType]:""}));
    } catch(error) {
      console.error("미리보기 생성 오류",imageType,error);
      setPreviewErrors(old=>({...old,[imageType]:"사진을 표시할 수 없습니다. 다른 JPG 사진으로 다시 선택해 주세요."}));
    }
  }

  function handlePreviewError(imageType,url,fileSetter,previewSetter) {
    if(previewUrlsRef.current[imageType]!==url) return;
    previewUrlsRef.current[imageType]=null;
    uploadedFilesRef.current[imageType]=null;
    fileSetter(null);
    previewSetter(null);
    setPreviewErrors(old=>({...old,[imageType]:"사진 미리보기에 실패했습니다. 다른 JPG 사진을 선택해 주세요."}));
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

  // Preserve successful uploads to enable retry without resending files.
  async function uploadArtworkImage(
    file,
    imageType
  ) {
    if(!file || file.size===0 || file.size>MAX_FILE_SIZE || !ALLOWED_IMAGE_TYPES.includes(file.type))
      throw new Error(IMAGE_LABELS[imageType]+" 사진의 형식과 용량을 확인해 주세요.");
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
      console.error("이미지 전송 실패",{imageType,statusCode:uploadError.statusCode,message:uploadError.message});
      throw new Error(IMAGE_LABELS[imageType]+" 이미지 전송 실패. 연결 상태와 사진을 확인해 주세요.");
    }

    const { data } = supabase.storage
      .from("artworks")
      .getPublicUrl(filePath);

    return { path: filePath, url: data.publicUrl };
  }

  // Sequential uploads: keep confirmed files available for retry.
  async function handleSubmit(event) {
    event.preventDefault();

    if (submitLock.current || isSubmitted) return;

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

    let mutationSent = false;
    submitLock.current = true;

    try {
      setIsSubmitting(true);

      // Send images sequentially. Reuse files confirmed by Storage on retry.
      const uploaded={};
      for(const [imageType,file] of [["original",originalFile],["parody",parodyFile],["ai",aiFile]]) {
        const cached=uploadedFilesRef.current[imageType];
        if(cached?.file===file) { uploaded[imageType]=cached.result; continue; }
        setUploadProgress(IMAGE_LABELS[imageType]+" 사진을 전송 중입니다…");
        const result=await uploadArtworkImage(file,imageType);
        uploadedFilesRef.current[imageType]={file,result};
        uploaded[imageType]=result;
      }
      const originalResult=uploaded.original,parodyResult=uploaded.parody,aiResult=uploaded.ai;
      setUploadProgress("사진 전송 완료. 작품 정보를 저장하는 중입니다…");

      /*
        직접 insert하지 않고
        안전 제출 함수 submit_artwork를 사용합니다.
      */
      mutationSent = true;
      const { error: submitError } =
        await supabase.rpc(
          "submit_artwork_reflection_v1",
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
            p_ai_reflection: aiReflection.trim(),
          }
        );

      if (submitError) {
        // 응답 유실 시 DB에는 저장되었을 수 있으므로 이미지를 보관합니다.

        throw new Error(
          `작품 정보 저장 실패: ${submitError.message}`
        );
      }

      setUploadProgress("");
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
      if (!mutationSent) {
        // Student codes do not grant Supabase Auth DELETE; never attempt to delete uploaded files.
        alert((error?.message||"이미지 업로드 실패")+
          "\n성공한 사진은 이 화면에 보관됩니다. 새로고침하지 말고 다시 등록해 주세요."+
          "\n임시 이미지는 자동으로 삭제하지 않습니다.");
      } else {
        setAccessStatus("idle"); setSubmissionState("");
        setAccessMessage("저장 결과를 확인하지 못했습니다. 접속코드 확인 버튼으로 제출 상태를 다시 확인해 주세요.");
        alert("저장 결과를 확인하지 못했습니다. 이미지와 입력 내용은 유지됩니다. 접속코드를 다시 확인해 주세요.");
      }
    } finally { submitLock.current = false; setIsSubmitting(false); setUploadProgress(''); }
  }

  if (validClass && (lastStudent === null || settingsError)) return <main className="register-page"><p role="status">{settingsError || "학급 설정을 확인하고 있습니다…"}</p>{settingsError && <a href={`/class/${classNumber}/student/${studentNumber}/register`}>다시 불러오기</a>}</main>;

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

<header className="register-topbar">

  {/* 왼쪽 : 전시실로 돌아가기 */}
  <Link
    href={`/class/${classNumber}`}
    className="register-topbar-button"
  >
    <span className="register-topbar-arrow">←</span>
    <span>{classNumber}반 전시실</span>
  </Link>


  {/* 가운데 : 현재 페이지 제목 */}
  <div className="register-topbar-main">

    <div className="register-topbar-title">
      <span className="register-topbar-icon">
        ✏️
      </span>

      <h1>
        내 작품 등록하기
      </h1>
    </div>

    <p>
      2학년 {classNumber}반 {studentNumber}번 ·
      나만의 작품을 등록하고 전시해 보세요!
    </p>

  </div>


  {/* 오른쪽 : 미술관 로비 */}
  <Link
    href="/"
    className="register-topbar-button register-topbar-home"
  >
    <span className="register-topbar-icon-small">
      🏛️
    </span>

    <span>
      우리들의 온라인 미술관
    </span>
  </Link>

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
                disabled={isCheckingAccess || isSubmitting}
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
                disabled={isCheckingAccess || isSubmitting}
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

              <p role="status">{uploadProgress}</p>
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
                        onError={() => handlePreviewError("original",originalImage,setOriginalFile,setOriginalImage)}
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
                      disabled={isSubmitting || isSubmitted}
                      onChange={(event) =>
                        previewImage(
                          event,
                          setOriginalFile,
                          setOriginalImage,
                          "original"
                        )
                      }
                    />

                  </label>

                  <p className="upload-help">
                    원작 이미지를 등록해 주세요.
                  </p>
                  {previewErrors.original && <p role="alert" className="upload-help">{previewErrors.original}</p>}

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
                        onError={() => handlePreviewError("parody",parodyImage,setParodyFile,setParodyImage)}
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
                      disabled={isSubmitting || isSubmitted}
                      onChange={(event) =>
                        previewImage(
                          event,
                          setParodyFile,
                          setParodyImage,
                          "parody"
                        )
                      }
                    />

                  </label>

                  <p className="upload-help">
                    직접 제작한 패러디 작품을
                    등록해 주세요.
                  </p>
                  {previewErrors.parody && <p role="alert" className="upload-help">{previewErrors.parody}</p>}

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
                        onError={() => handlePreviewError("ai",aiImage,setAiFile,setAiImage)}
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
                      disabled={isSubmitting || isSubmitted}
                      onChange={(event) =>
                        previewImage(
                          event,
                          setAiFile,
                          setAiImage,
                          "ai"
                        )
                      }
                    />

                  </label>

                  <p className="upload-help">
                    AI를 활용해 재해석한 이미지를
                    등록해 주세요.
                  </p>
                  {previewErrors.ai && <p role="alert" className="upload-help">{previewErrors.ai}</p>}

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

                <article className="writing-card" style={{ gridColumn: "1 / -1" }}>
                  <span className="writing-number">04</span>
                  <label htmlFor="aiReflection">AI 변환 후 느낀 점</label>
                  <p>AI가 변환한 작품과 내가 직접 그린 작품을 비교하고, 느낀 점을 작성해 주세요.</p>
                  <textarea
                    id="aiReflection"
                    value={aiReflection}
                    onChange={(event) => setAiReflection(event.target.value)}
                    maxLength={500}
                    placeholder="예: AI가 원작의 거친 붓질을 잘 표현했지만, 인물의 표정은 내가 의도한 것보다 밝게 바뀌었습니다. 내가 직접 그린 그림의 익살스러운 표정이 더 마음에 듭니다."
                  />
                  <span className="character-count">{aiReflection.length} / 500</span>
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
