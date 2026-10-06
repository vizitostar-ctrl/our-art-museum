import PublicNote from "../../../../learning/PublicNote";
import Inbox from "../../../../learning/Inbox";
import LoadError from "../../../../LoadError";
import ArtworkReactions from "../../../../ArtworkReactions";
import gallery from "../../../../Gallery.module.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../../supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentArtworkPage({ params }) {
  const { classNo, number } = await params;

  const classNumber = Number(classNo);
  const studentNumber = Number(number);

  if (
    !Number.isInteger(classNumber) ||
    classNumber < 1 ||
    classNumber > 10
  ) {
    notFound();
  }

  if (
    !Number.isInteger(studentNumber) ||
    studentNumber < 1 ||
    studentNumber > 50
  ) {
    notFound();
  }

  const { data: settings, error: settingsError } = await supabase.rpc("get_exhibition_settings_v1");
  const config = settings?.find(row => Number(row.class_no) === classNumber);
  if (settingsError || !config) return <LoadError retryHref={`/class/${classNumber}/student/${studentNumber}`} />;
  if (studentNumber > config.last_student_no) notFound();

  const { data: artwork, error } = await supabase
    .from("artworks")
    .select("*")
    .eq("class_no", classNumber)
    .eq("student_no", studentNumber)
    .eq("status", "approved")
    .order("created_at", { ascending: false }).order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return <LoadError retryHref={`/class/${classNumber}/student/${studentNumber}`} />;

  const numberStyle = {
    width: "34px",
    height: "34px",
    flexShrink: 0,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f2eadf",
    border: "1px solid #ddcdb9",
    fontSize: "11px",
    fontWeight: "700",
    color: "#8b6846",
  };

  const metaStyle = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  };

  return (
    <main className={`student-page ${gallery.gallery} ${gallery.compact}`}>
      <div className="student-page-inner">

        <nav className={gallery.breadcrumb} aria-label="현재 위치">
          <Link href="/">전체 로비</Link><span aria-hidden="true">/</span>
          <Link href={`/class/${classNumber}`}>2학년 {classNumber}반</Link><span aria-hidden="true">/</span>
          <span>{studentNumber}번 작품관</span>
        </nav>
        {/* 상단 이동 버튼 */}
        <div className="student-action-buttons">
          <Link
            href={`/class/${classNumber}`}
            className="backButton"
          >
            ← {classNumber}반 전시실
          </Link>

          <Link
            href={`/class/${classNumber}/student/${studentNumber}/register`}
            className="registerButton"
          >
            내 작품 등록하기 ↗
          </Link>
        </div>

        {/* 학생 작품 페이지 상단 */}
        <header className="student-page-header">
          <span className="student-page-label">
            우리들의 온라인 미술관
          </span>

          <h1>
            2-{classNumber} {studentNumber}번 작품
          </h1>

          <p>
            원작의 표현을 관찰하고, 나의 패러디에 다시 입히다.
          </p>
        </header>

        {!artwork ? (
          <section className="artist-note">
            <div className="artist-note-heading">
              <span>EXHIBITION STATUS</span>
              <h2>아직 승인된 작품이 없습니다</h2>
            </div>

            <div className="note-grid">
              <article className="note-card">
                <span className="note-number">01</span>

                <h3>작품을 제출했나요?</h3>

                <p>
                  작품을 제출했다면 현재 선생님의 확인을
                  기다리고 있는 중입니다.
                </p>
              </article>

              <article className="note-card">
                <span className="note-number">02</span>

                <h3>승인 후 전시됩니다</h3>

                <p>
                  선생님이 작품과 설명을 확인한 뒤 승인하면
                  이 페이지에 실제 작품이 표시됩니다.
                </p>
              </article>

              <article className="note-card">
                <span className="note-number">03</span>

                <h3>개인정보 보호</h3>

                <p>
                  학생 이름은 표시하지 않고
                  학년·반·번호만 사용합니다.
                </p>
              </article>
            </div>
          </section>
        ) : (
          <>
            {/* 작품 3개 비교 */}
            <section className="artwork-section">

              <div className="artwork-section-title">
                <span>ARTWORK COMPARISON</span>
                <h2>세 작품을 비교해 보세요</h2>
              </div>

              <div className="artwork-grid">

                {/* 원작 */}
                <article className="artwork-card">

                  <div className="artwork-image">
                    {artwork.original_url ? (
                      <img
                        src={artwork.original_url}
                        alt="원작"
                      />
                    ) : (
                      <span className="image-placeholder">
                        원작 이미지
                      </span>
                    )}
                  </div>

                  <div className="artwork-card-text">

                    <div style={metaStyle}>
                      <span style={numberStyle}>
                        01
                      </span>

                      <span className="artwork-type">
                        ORIGINAL
                      </span>
                    </div>

                    <h2>원작</h2>

                    <p>
                      작품을 관찰하며 색채, 붓질, 질감과
                      화면의 특징을 찾아보았습니다.
                    </p>
                  </div>
                </article>

                {/* 패러디 */}
                <article className="artwork-card">

                  <div className="artwork-image">
                    {artwork.parody_url ? (
                      <img
                        src={artwork.parody_url}
                        alt="나의 패러디 작품"
                      />
                    ) : (
                      <span className="image-placeholder">
                        패러디 작품
                      </span>
                    )}
                  </div>

                  <div className="artwork-card-text">

                    <div style={metaStyle}>
                      <span style={numberStyle}>
                        02
                      </span>

                      <span className="artwork-type">
                        MY PARODY
                      </span>
                    </div>

                    <h2>나의 패러디</h2>

                    <p>
                      원작의 특징을 이해하고 나만의 생각과
                      소재를 활용해 표현했습니다.
                    </p>
                  </div>
                </article>

                {/* AI 재해석 */}
                <article className="artwork-card">

                  <div className="artwork-image">
                    {artwork.ai_url ? (
                      <img
                        src={artwork.ai_url}
                        alt="AI 재해석 작품"
                      />
                    ) : (
                      <span className="image-placeholder">
                        AI 재해석 작품
                      </span>
                    )}
                  </div>

                  <div className="artwork-card-text">

                    <div style={metaStyle}>
                      <span style={numberStyle}>
                        03
                      </span>

                      <span className="artwork-type">
                        AI REINTERPRETATION
                      </span>
                    </div>

                    <h2>AI 재해석</h2>

                    <p>
                      원작에서 발견한 표현 특징을 프롬프트로
                      작성하여 AI로 다시 표현했습니다.
                    </p>
                  </div>
                </article>

              </div>
            </section>

            {/* 작품 이야기 */}
            <section className="artist-note">

              <div className="artist-note-heading">
                <span>ARTIST NOTE</span>
                <h2>작품 이야기</h2>
              </div>

              <div className="note-grid">

                <article className="note-card">
                  <span className="note-number">
                    01
                  </span>

                  <h3>원작에서 발견한 특징</h3>

                  <p>
                    {artwork.feature ||
                      "작성된 내용이 없습니다."}
                  </p>
                </article>

                <article className="note-card">
                  <span className="note-number">
                    02
                  </span>

                  <h3>나의 표현 의도</h3>

                  <p>
                    {artwork.intent ||
                      "작성된 내용이 없습니다."}
                  </p>
                </article>

                <article className="note-card">
                  <span className="note-number">
                    03
                  </span>

                  <h3>AI에게 전달한 표현 특징</h3>

                  <p>
                    {artwork.prompt_text ||
                      "작성된 내용이 없습니다."}
                  </p>
                </article>

              </div>
            </section>

            <PublicNote artworkId={artwork.id} />
            <ArtworkReactions artworkId={artwork.id} />
          </>
        )}

        <Inbox classNo={classNumber} studentNo={studentNumber} />
        {/* 개인정보 안내 */}
        <footer className="student-footer">
          <p>
            학생의 개인정보 보호를 위해
            학년·반·번호만 표시합니다.
          </p>
        </footer>

      </div>
    </main>
  );
}
