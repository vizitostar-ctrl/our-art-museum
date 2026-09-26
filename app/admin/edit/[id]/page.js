"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../supabase";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function AdminArtworkEditPage() {
  const params = useParams();
  const router = useRouter();

  const artworkId = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id;

  const [artwork, setArtwork] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [feature, setFeature] = useState("");
  const [intent, setIntent] = useState("");
  const [promptText, setPromptText] = useState("");

  const [originalFile, setOriginalFile] = useState(null);
  const [parodyFile, setParodyFile] = useState(null);
  const [aiFile, setAiFile] = useState(null);

  const [originalPreview, setOriginalPreview] = useState("");
  const [parodyPreview, setParodyPreview] = useState("");
  const [aiPreview, setAiPreview] = useState("");

  useEffect(() => {
    loadArtwork();
  }, [artworkId]);

  /*
    새로 선택한 이미지의 Blob URL을
    페이지 이동 시 안전하게 정리합니다.
  */
  useEffect(() => {
    return () => {
      if (originalPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(originalPreview);
      }
    };
  }, [originalPreview]);

  useEffect(() => {
    return () => {
      if (parodyPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(parodyPreview);
      }
    };
  }, [parodyPreview]);

  useEffect(() => {
    return () => {
      if (aiPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(aiPreview);
      }
    };
  }, [aiPreview]);

  async function loadArtwork() {
    if (!artworkId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      /*
        관리자 로그인 확인
      */
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/admin/login");
        return;
      }

      /*
        작품 정보 불러오기
      */
      const { data, error } = await supabase
        .from("artworks")
        .select("*")
        .eq("id", artworkId)
        .single();

      if (error) {
        throw error;
      }

      setArtwork(data);

      setTitle(data.title || "");
      setOriginalTitle(data.original_title || "");
      setFeature(data.feature || "");
      setIntent(data.intent || "");
      setPromptText(data.prompt_text || "");

      setOriginalPreview(data.original_url || "");
      setParodyPreview(data.parody_url || "");
      setAiPreview(data.ai_url || "");
    } catch (error) {
      console.error(error);

      alert(
        "수정할 작품을 불러오지 못했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }

  /*
    이미지 파일 검사
  */
  function validateImage(file) {
    if (
      !ALLOWED_IMAGE_TYPES.includes(file.type)
    ) {
      alert(
        "JPG, PNG, WebP 이미지만 사용할 수 있습니다."
      );

      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert(
        "이미지 한 장의 용량은 5MB 이하로 선택해 주세요."
      );

      return false;
    }

    return true;
  }

  /*
    교사가 새 이미지를 선택했을 때
    미리보기 생성
  */
  function changeImage(
    event,
    setFile,
    setPreview
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!validateImage(file)) {
      event.target.value = "";
      return;
    }

    setFile(file);
    setPreview(
      URL.createObjectURL(file)
    );
  }

  function getExtension(file) {
    if (file.type === "image/png") {
      return "png";
    }

    if (file.type === "image/webp") {
      return "webp";
    }

    return "jpg";
  }

  function makeId() {
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

  /*
    교사가 선택한 새 이미지를
    Supabase Storage에 업로드
  */
  async function uploadImage(
    file,
    type
  ) {
    const extension =
      getExtension(file);

    const path =
      `class-${artwork.class_no}/` +
      `student-${artwork.student_no}/` +
      `${Date.now()}-${makeId()}-` +
      `teacher-${type}.${extension}`;

    const { error } =
      await supabase.storage
        .from("artworks")
        .upload(
          path,
          file,
          {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          }
        );

    if (error) {
      throw new Error(
        `${type} 이미지 업로드 실패: ${error.message}`
      );
    }

    const { data } =
      supabase.storage
        .from("artworks")
        .getPublicUrl(path);

    return {
      path,
      url: data.publicUrl,
    };
  }

  /*
    public URL에서 실제 Storage 경로 추출
  */
  function getStoragePath(publicUrl) {
    if (!publicUrl) {
      return null;
    }

    const marker =
      "/storage/v1/object/public/artworks/";

    const index =
      publicUrl.indexOf(marker);

    if (index === -1) {
      return null;
    }

    const path = publicUrl
      .slice(index + marker.length)
      .split("?")[0];

    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  }

  /*
    Storage 이미지 파일 삭제
  */
  async function removeFiles(paths) {
    const cleanPaths = [
      ...new Set(
        paths.filter(Boolean)
      ),
    ];

    if (cleanPaths.length === 0) {
      return;
    }

    const { error } =
      await supabase.storage
        .from("artworks")
        .remove(cleanPaths);

    if (error) {
      console.error(
        "Storage 이미지 정리 실패:",
        error
      );
    }
  }

  /*
    작품 수정 저장

    approveAfterSave = false
      → 현재 상태 유지

    approveAfterSave = true
      → 저장 후 바로 승인
  */
  async function saveArtwork(
    approveAfterSave = false
  ) {
    if (!artwork || isSaving) {
      return;
    }

    if (!title.trim()) {
      alert(
        "작품 제목을 입력해 주세요."
      );

      return;
    }

    if (
      !feature.trim() ||
      !intent.trim() ||
      !promptText.trim()
    ) {
      alert(
        "작품 이야기 세 항목을 모두 작성해 주세요."
      );

      return;
    }

    /*
      새로 업로드된 이미지
      → DB 저장 실패 시 삭제하기 위해 보관
    */
    const uploadedPaths = [];

    /*
      교체된 기존 이미지
      → DB 저장 성공 후 삭제
    */
    const oldPaths = [];

    try {
      setIsSaving(true);

      let originalUrl =
        artwork.original_url;

      let parodyUrl =
        artwork.parody_url;

      let aiUrl =
        artwork.ai_url;

      /*
        원작 이미지 교체
      */
      if (originalFile) {
        const result =
          await uploadImage(
            originalFile,
            "original"
          );

        uploadedPaths.push(
          result.path
        );

        oldPaths.push(
          getStoragePath(
            artwork.original_url
          )
        );

        originalUrl =
          result.url;
      }

      /*
        패러디 이미지 교체
      */
      if (parodyFile) {
        const result =
          await uploadImage(
            parodyFile,
            "parody"
          );

        uploadedPaths.push(
          result.path
        );

        oldPaths.push(
          getStoragePath(
            artwork.parody_url
          )
        );

        parodyUrl =
          result.url;
      }

      /*
        AI 이미지 교체
      */
      if (aiFile) {
        const result =
          await uploadImage(
            aiFile,
            "ai"
          );

        uploadedPaths.push(
          result.path
        );

        oldPaths.push(
          getStoragePath(
            artwork.ai_url
          )
        );

        aiUrl =
          result.url;
      }

      /*
        DB에 저장할 최종 값
      */
      const updateData = {
        title: title.trim(),

        original_title:
          originalTitle.trim(),

        feature:
          feature.trim(),

        intent:
          intent.trim(),

        prompt_text:
          promptText.trim(),

        original_url:
          originalUrl,

        parody_url:
          parodyUrl,

        ai_url:
          aiUrl,
      };

      /*
        수정 후 승인 버튼을 누른 경우
      */
      if (approveAfterSave) {
        updateData.status =
          "approved";
      }

      /*
        DB 수정
      */
      const { error } =
        await supabase
          .from("artworks")
          .update(updateData)
          .eq("id", artwork.id);

      if (error) {
        /*
          DB 저장이 실패하면
          방금 업로드한 새 파일 삭제
        */
        await removeFiles(
          uploadedPaths
        );

        throw new Error(
          `작품 저장 실패: ${error.message}`
        );
      }

      /*
        DB 저장 성공 후
        교체된 기존 이미지 삭제
      */
      await removeFiles(
        oldPaths
      );

      alert(
        approveAfterSave
          ? "수정한 작품을 저장하고 승인했습니다."
          : "수정한 내용을 저장했습니다."
      );

      /*
        관리자 페이지로 돌아가기
      */
      router.push("/admin");
    } catch (error) {
      console.error(error);

      alert(
        "작품 수정 중 문제가 발생했습니다.\n\n" +
          (error?.message ||
            "잠시 후 다시 시도해 주세요.")
      );
    } finally {
      setIsSaving(false);
    }
  }

  function statusLabel(status) {
    if (status === "approved") {
      return "승인 완료";
    }

    if (status === "revision") {
      return "수정 필요";
    }

    if (status === "hidden") {
      return "숨김";
    }

    return "승인 대기";
  }

  function statusClass(status) {
    if (status === "approved") {
      return "approved";
    }

    if (status === "revision") {
      return "revision";
    }

    if (status === "hidden") {
      return "hidden";
    }

    return "pending";
  }

  /*
    로딩 화면
  */
  if (isLoading) {
    return (
      <main className="admin-edit-loading">
        작품 정보를 불러오는 중입니다...

        <PageStyles />
      </main>
    );
  }

  /*
    작품이 없는 경우
  */
  if (!artwork) {
    return (
      <main className="admin-edit-page">

        <section className="admin-edit-not-found">
          <h1>
            작품을 찾을 수 없습니다.
          </h1>

          <Link href="/admin">
            ← 관리자 페이지로 돌아가기
          </Link>
        </section>

        <PageStyles />

      </main>
    );
  }

  return (
    <main className="admin-edit-page">

      <div className="admin-edit-inner">

        {/* 상단 제목 */}
        <header className="admin-edit-header">

          <div>
            <span className="admin-edit-eyebrow">
              TEACHER ARTWORK EDIT
            </span>

            <h1>
              ✏️ 교사 작품 수정
            </h1>

            <div className="admin-edit-meta">

              <span>
                2학년 {artwork.class_no}반{" "}
                {artwork.student_no}번
              </span>

              <span
                className={
                  `admin-edit-status ` +
                  statusClass(
                    artwork.status
                  )
                }
              >
                {statusLabel(
                  artwork.status
                )}
              </span>

            </div>
          </div>

          <Link
            href="/admin"
            className="admin-edit-back"
          >
            ← 관리자 페이지
          </Link>

        </header>


        {/* 이미지 수정 */}
        <section className="admin-edit-card">

          <div className="admin-edit-section-title">

            <span>
              STEP 01
            </span>

            <h2>
              작품 이미지 교체
            </h2>

            <p>
              잘못 등록된 이미지만 새로 선택하세요.
              선택하지 않은 이미지는 그대로 유지됩니다.
            </p>

          </div>

          <div className="admin-edit-image-grid">

            <ImageEditor
              label="원작"
              description="원작 이미지"
              preview={
                originalPreview
              }
              disabled={
                isSaving
              }
              onChange={(event) =>
                changeImage(
                  event,
                  setOriginalFile,
                  setOriginalPreview
                )
              }
            />

            <ImageEditor
              label="나의 패러디"
              description="학생이 제작한 패러디 작품"
              preview={
                parodyPreview
              }
              disabled={
                isSaving
              }
              onChange={(event) =>
                changeImage(
                  event,
                  setParodyFile,
                  setParodyPreview
                )
              }
            />

            <ImageEditor
              label="AI 재해석"
              description="AI를 활용한 재해석 작품"
              preview={
                aiPreview
              }
              disabled={
                isSaving
              }
              onChange={(event) =>
                changeImage(
                  event,
                  setAiFile,
                  setAiPreview
                )
              }
            />

          </div>

        </section>


        {/* 텍스트 수정 */}
        <section className="admin-edit-card">

          <div className="admin-edit-section-title">

            <span>
              STEP 02
            </span>

            <h2>
              작품 정보 수정
            </h2>

            <p>
              잘못 입력된 부분만 필요한 만큼 수정할 수 있습니다.
            </p>

          </div>


          <EditField
            label="작품 제목"
          >
            <input
              type="text"
              value={title}
              disabled={
                isSaving
              }
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
            />
          </EditField>


          <EditField
            label="원작 제목"
            optional
          >
            <input
              type="text"
              value={
                originalTitle
              }
              disabled={
                isSaving
              }
              placeholder="필요한 경우 입력하세요."
              onChange={(event) =>
                setOriginalTitle(
                  event.target.value
                )
              }
            />
          </EditField>


          <EditField
            label="원작에서 발견한 특징"
          >
            <textarea
              rows={5}
              value={
                feature
              }
              disabled={
                isSaving
              }
              onChange={(event) =>
                setFeature(
                  event.target.value
                )
              }
            />
          </EditField>


          <EditField
            label="나의 표현 의도"
          >
            <textarea
              rows={5}
              value={
                intent
              }
              disabled={
                isSaving
              }
              onChange={(event) =>
                setIntent(
                  event.target.value
                )
              }
            />
          </EditField>


          <EditField
            label="AI에게 전달한 표현 특징"
          >
            <textarea
              rows={5}
              value={
                promptText
              }
              disabled={
                isSaving
              }
              onChange={(event) =>
                setPromptText(
                  event.target.value
                )
              }
            />
          </EditField>

        </section>


        {/* 저장 버튼 */}
        <section className="admin-edit-actions">

          <Link
            href="/admin"
            className="admin-edit-button cancel"
          >
            취소
          </Link>

          <button
            type="button"
            className="admin-edit-button save"
            disabled={
              isSaving
            }
            onClick={() =>
              saveArtwork(false)
            }
          >
            {isSaving
              ? "저장 중..."
              : "수정 내용 저장"}
          </button>

          <button
            type="button"
            className="admin-edit-button approve"
            disabled={
              isSaving
            }
            onClick={() =>
              saveArtwork(true)
            }
          >
            {isSaving
              ? "저장 중..."
              : "✓ 수정 후 승인"}
          </button>

        </section>

      </div>

      <PageStyles />

    </main>
  );
}


/*
  이미지 수정 카드
*/
function ImageEditor({
  label,
  description,
  preview,
  disabled,
  onChange,
}) {
  return (
    <div className="admin-edit-image-card">

      <div className="admin-edit-preview">

        {preview ? (
          <img
            src={preview}
            alt={label}
          />
        ) : (
          <span>
            이미지 없음
          </span>
        )}

      </div>

      <div className="admin-edit-image-info">

        <strong>
          {label}
        </strong>

        <p>
          {description}
        </p>

        <label className="admin-edit-file-button">

          이미지 교체

          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            disabled={disabled}
            onChange={onChange}
          />

        </label>

      </div>

    </div>
  );
}


/*
  텍스트 입력 필드
*/
function EditField({
  label,
  optional = false,
  children,
}) {
  return (
    <label className="admin-edit-field">

      <div className="admin-edit-field-label">

        <strong>
          {label}
        </strong>

        {optional && (
          <span>
            선택 입력
          </span>
        )}

      </div>

      {children}

    </label>
  );
}


/*
  페이지 스타일

  global 스타일을 사용해
  ImageEditor / EditField 같은
  하위 컴포넌트에도 동일하게 적용합니다.
*/
function PageStyles() {
  return (
    <style jsx global>{`

      .admin-edit-page {
        min-height: 100vh;
        padding: 36px 20px 80px;
        background: #f7f2e8;
        color: #211a14;
      }

      .admin-edit-inner {
        width: 100%;
        max-width: 1180px;
        margin: 0 auto;
      }


      /* 상단 */

      .admin-edit-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 20px;
        margin-bottom: 28px;
      }

      .admin-edit-eyebrow {
        display: block;
        margin-bottom: 8px;
        color: #9a7b55;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.16em;
      }

      .admin-edit-header h1 {
        margin: 0 0 10px;
        font-size: 32px;
        color: #17120e;
      }

      .admin-edit-meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        color: #75695d;
        font-size: 14px;
      }

      .admin-edit-status {
        display: inline-block;
        padding: 5px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
      }

      .admin-edit-status.pending {
        background: #f4eadf;
      }

      .admin-edit-status.approved {
        background: #e8f4e7;
      }

      .admin-edit-status.revision {
        background: #fff1d9;
      }

      .admin-edit-status.hidden {
        background: #eeeeee;
      }

      .admin-edit-back {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 16px;
        border: 1px solid #d5c8b6;
        border-radius: 999px;
        background: #fffdfa;
        color: #2b2119;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
      }


      /* 공통 카드 */

      .admin-edit-card {
        margin-bottom: 20px;
        padding: 26px;
        border: 1px solid #ddd1bf;
        border-radius: 20px;
        background: #fffdfa;
      }

      .admin-edit-section-title {
        margin-bottom: 22px;
      }

      .admin-edit-section-title > span {
        display: block;
        margin-bottom: 6px;
        color: #a07d56;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.14em;
      }

      .admin-edit-section-title h2 {
        margin: 0 0 7px;
        font-size: 22px;
      }

      .admin-edit-section-title p {
        margin: 0;
        color: #786c60;
        font-size: 14px;
        line-height: 1.7;
      }


      /* 이미지 */

      .admin-edit-image-grid {
        display: grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(240px, 1fr)
          );
        gap: 16px;
      }

      .admin-edit-image-card {
        overflow: hidden;
        border: 1px solid #e0d5c5;
        border-radius: 16px;
        background: #faf6ef;
      }

      .admin-edit-preview {
        height: 280px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f1ebe1;
      }

      .admin-edit-preview img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .admin-edit-preview span {
        color: #897b6d;
        font-size: 14px;
      }

      .admin-edit-image-info {
        padding: 16px;
        background: #fffdfa;
      }

      .admin-edit-image-info strong {
        display: block;
        margin-bottom: 5px;
        font-size: 16px;
      }

      .admin-edit-image-info p {
        margin: 0 0 14px;
        color: #837669;
        font-size: 12px;
      }

      .admin-edit-file-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 9px 14px;
        border: 1px solid #d3c4b3;
        border-radius: 999px;
        background: #f7f1e8;
        color: #342a21;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }

      .admin-edit-file-button input {
        display: none;
      }


      /* 텍스트 입력 */

      .admin-edit-field {
        display: block;
        margin-bottom: 20px;
      }

      .admin-edit-field:last-child {
        margin-bottom: 0;
      }

      .admin-edit-field-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }

      .admin-edit-field-label strong {
        font-size: 14px;
      }

      .admin-edit-field-label span {
        color: #9b8c7c;
        font-size: 12px;
      }

      .admin-edit-field input,
      .admin-edit-field textarea {
        display: block;
        width: 100%;
        box-sizing: border-box;
        padding: 12px 14px;
        border: 1px solid #d7cabb;
        border-radius: 10px;
        background: #ffffff;
        color: #292119;
        font: inherit;
      }

      .admin-edit-field input:focus,
      .admin-edit-field textarea:focus {
        outline: 2px solid #d8c3a6;
        outline-offset: 1px;
      }

      .admin-edit-field textarea {
        line-height: 1.7;
        resize: vertical;
      }


      /* 하단 버튼 */

      .admin-edit-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 10px;
        padding: 20px 0;
      }

      .admin-edit-button {
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        padding: 11px 19px;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
      }

      .admin-edit-button:disabled {
        opacity: 0.55;
        cursor: default;
      }

      .admin-edit-button.cancel {
        border: 1px solid #d5c8b6;
        background: #fffdfa;
        color: #2b2119;
      }

      .admin-edit-button.save {
        border: 1px solid #b7a48f;
        background: #f4eadf;
        color: #2b2119;
      }

      .admin-edit-button.approve {
        border: none;
        background: #263b28;
        color: #ffffff;
      }


      /* 로딩 */

      .admin-edit-loading {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f7f2e8;
        color: #6e6255;
      }


      /* 없는 작품 */

      .admin-edit-not-found {
        width: 100%;
        max-width: 720px;
        box-sizing: border-box;
        margin: 60px auto;
        padding: 40px;
        border: 1px solid #ddd1bf;
        border-radius: 20px;
        background: #fffdfa;
        text-align: center;
      }

      .admin-edit-not-found a {
        display: inline-block;
        margin-top: 16px;
        color: #342a21;
        font-weight: 700;
      }


      /* 모바일 */

      @media (max-width: 700px) {

        .admin-edit-page {
          padding: 24px 14px 60px;
        }

        .admin-edit-header {
          align-items: flex-start;
        }

        .admin-edit-header h1 {
          font-size: 27px;
        }

        .admin-edit-back {
          width: 100%;
          box-sizing: border-box;
        }

        .admin-edit-card {
          padding: 18px;
        }

        .admin-edit-preview {
          height: 230px;
        }

        .admin-edit-actions {
          flex-direction: column;
        }

        .admin-edit-button {
          width: 100%;
        }

      }

    `}</style>
  );
}
