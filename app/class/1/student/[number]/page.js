import Link from "next/link";
import { supabase } from "../../../../supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentArtworkPage({ params }) {
  const { number } = await params;
  const studentNumber = Number(number);

  const { data: artwork, error } = await supabase
    .from("artworks")
    .select("*")
    .eq("class_no", 1)
    .eq("student_no", studentNumber)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("작품 불러오기 오류:", error);
  }

  return (
    <main className="student-page">
      <div className="student-page-inner">

        {/* 상단 이동 버튼 */}
        <div className="student-action-buttons">
          <Link href="/class/1" className="backButton">
            ← 1반 전시실
          </Link>

          <Link
            href={`/class/1/student/${number}/register`}
            className="registerButton"
          >
            ✏️ 내 작품 등록하기
          </Link>
        </div>

        {/* 학생 작품 페이지 상단 */}
        <header className="student-page-header">
          <span className="student-page-label">
            우리들의 온라인 미술관
          </span>

          <h1>2-1 {number}번 작품</h1>

          <p>
            명화를 관찰하고, 패러디하고,
            <br />
            AI를 활용하여 원작의 표현 특징을 다시 해석했습니다.
          </p>
        </header>

        {!artwork ? (
          <>
            {/* 승인 대기 화면 */}
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
          </>
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
                    <span className="artwork-number">01</span>

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
                    <span className="artwork-type">
                      ORIGINAL
                    </span>

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
                    <span className="artwork-number">02</span>

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
                    <span className="artwork-type">
                      MY PARODY
                    </span>

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
                    <span className="artwork-number">03</span>

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
                    <span className="artwork-type">
                      AI REINTERPRETATION
                    </span>

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
                  <span className="note-number">01</span>

                  <h3>원작에서 발견한 특징</h3>

                  <p>
                    {artwork.feature ||
                      "작성된 내용이 없습니다."}
                  </p>
                </article>

                <article className="note-card">
                  <span className="note-number">02</span>

                  <h3>나의 표현 의도</h3>

                  <p>
                    {artwork.intent ||
                      "작성된 내용이 없습니다."}
                  </p>
                </article>

                <article className="note-card">
                  <span className="note-number">03</span>

                  <h3>AI에게 전달한 표현 특징</h3>

                  <p>
                    {artwork.prompt_text ||
                      "작성된 내용이 없습니다."}
                  </p>
                </article>

              </div>
            </section>

            {/* 감상 반응 */}
            <section className="reaction-section">

              <div>
                <span className="reaction-label">
                  ART REACTION
                </span>

                <h2>
                  이 작품을 어떻게 감상했나요?
                </h2>

                <p>
                  작품의 순위를 정하는 것이 아니라,
                  친구 작품에서 느낀 점을 표현해 보세요.
                </p>
              </div>

              <div className="reaction-buttons">
                <button
                  type="button"
                  className="reaction-button"
                >
                  💗 마음에 와닿아요
                </button>

                <button
                  type="button"
                  className="reaction-button"
                >
                  🎨 색채가 인상적이에요
                </button>

                <button
                  type="button"
                  className="reaction-button"
                >
                  💡 아이디어가 재미있어요
                </button>
              </div>

            </section>
          </>
        )}

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
