import Link from "next/link";

export default async function StudentArtworkPage({ params }) {
  const { number } = await params;

  return (
    <main className="student-page">
      <div className="student-page-inner">

        {/* 전시실로 돌아가기 */}
        <header className="student-page-header">
          <Link href="/class/1" className="backButton">
            ← 1반 전시실
          </Link>

          <br />

          <span className="student-page-label">
            우리들의 온라인 미술관
          </span>

          <h1>2-1 {number}번 작품</h1>

          <p>
            명화를 관찰하고, 패러디하고,
            AI로 다시 해석한 작품입니다.
          </p>
        </header>


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
              </div>

              <div className="artwork-info">
                <span className="artwork-type">ORIGINAL</span>
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
              </div>

              <div className="artwork-info">
                <span className="artwork-type">MY PARODY</span>
                <h2>나의 패러디</h2>

                <p>
                  원작의 특징을 이해하고 나만의 생각과
                  소재를 활용하여 새롭게 표현했습니다.
                </p>
              </div>
            </article>


            {/* AI 재해석 */}
            <article className="artwork-card">
              <div className="artwork-image">
                <span className="artwork-number">03</span>
              </div>

              <div className="artwork-info">
                <span className="artwork-type">AI REINTERPRETATION</span>
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
                학생이 관찰한 색채, 붓질, 질감,
                화면 구성 등의 특징이 이곳에 표시됩니다.
              </p>
            </article>


            <article className="note-card">
              <span className="note-number">02</span>

              <h3>나의 표현 의도</h3>

              <p>
                패러디 작품에서 무엇을 바꾸었고
                어떻게 표현했는지 설명합니다.
              </p>
            </article>


            <article className="note-card">
              <span className="note-number">03</span>

              <h3>AI에게 전달한 표현 특징</h3>

              <p>
                AI 이미지 제작을 위해 작성한 색채,
                붓질, 질감 등의 표현 내용을 보여줍니다.
              </p>
            </article>

          </div>
        </section>


        {/* 감상 반응 */}
        <section className="reaction-section">

          <h2>작품을 감상해 보세요</h2>

          <p>
            작품에서 인상적이었던 점을 선택해 보세요.
          </p>

          <div className="reaction-buttons">

            <button className="reaction-button">
              ❤️ 마음에 와닿아요
            </button>

            <button className="reaction-button">
              🎨 색채가 인상적이에요
            </button>

            <button className="reaction-button">
              💡 아이디어가 재미있어요
            </button>

            <button className="reaction-button">
              🖌️ 표현이 흥미로워요
            </button>

            <button className="reaction-button">
              ✨ AI 재해석이 인상적이에요
            </button>

          </div>
        </section>

      </div>
    </main>
  );
}
