import Link from "next/link";

export default async function StudentArtworkPage({ params }) {
  const { number } = await params;

  return (
    <main className="studentPage">

      <div className="studentTop">
        <Link href="/class/1" className="backButton">
          ← 1반 전시실
        </Link>
      </div>

      <header className="studentHeader">
        <p className="classLabel">우리들의 온라인 미술관</p>

        <h1>2-1 {number}번 작품</h1>

        <p className="studentDescription">
          명화를 관찰하고 패러디한 뒤,
          <br />
          AI를 활용하여 원작의 표현 특징을 다시 해석했습니다.
        </p>
      </header>

      <section className="artworkCompare">

        <article className="artworkPanel">
          <div className="artworkImage">
            원작 이미지
          </div>

          <div className="artworkText">
            <span className="artworkNumber">01</span>
            <h2>원작</h2>
            <p>
              작품을 관찰하며 색채, 붓질, 질감과
              화면의 특징을 찾아보았습니다.
            </p>
          </div>
        </article>

        <article className="artworkPanel">
          <div className="artworkImage">
            패러디 작품
          </div>

          <div className="artworkText">
            <span className="artworkNumber">02</span>
            <h2>나의 패러디</h2>
            <p>
              원작의 특징을 이해하고
              나만의 생각과 소재를 활용해 표현했습니다.
            </p>
          </div>
        </article>

        <article className="artworkPanel">
          <div className="artworkImage">
            AI 재해석 작품
          </div>

          <div className="artworkText">
            <span className="artworkNumber">03</span>
            <h2>AI 재해석</h2>
            <p>
              원작에서 발견한 표현 특징을
              프롬프트로 작성하여 AI로 다시 표현했습니다.
            </p>
          </div>
        </article>

      </section>

      <section className="artistNote">

        <div className="noteTitle">
          <span>ARTIST NOTE</span>
          <h2>작품 이야기</h2>
        </div>

        <div className="noteGrid">

          <article className="noteCard">
            <span>01</span>
            <h3>원작에서 발견한 특징</h3>
            <p>
              학생이 관찰한 색채, 붓질, 질감 등의
              특징이 이곳에 표시됩니다.
            </p>
          </article>

          <article className="noteCard">
            <span>02</span>
            <h3>나의 표현 의도</h3>
            <p>
              패러디 작품에서 무엇을 바꾸었고
              어떻게 표현했는지 설명합니다.
            </p>
          </article>

          <article className="noteCard">
            <span>03</span>
            <h3>AI에게 전달한 표현 특징</h3>
            <p>
              AI 이미지 제작을 위해 작성한
              색채·붓질·질감 등의 표현 내용을 보여줍니다.
            </p>
          </article>

        </div>
      </section>

      <section className="reactionSection">
        <p>작품을 감상하고 마음을 남겨보세요.</p>

        <div className="reactionButtons">
          <button>❤️ 마음에 와닿아요</button>
          <button>🎨 색채가 인상적이에요</button>
          <button>💡 아이디어가 재미있어요</button>
        </div>
      </section>

    </main>
  );
}
