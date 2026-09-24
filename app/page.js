export default function Home() {
  const classes = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <main className="museum">
      <header className="museum-header">
        <h1>🎨 우리들의 온라인 미술관</h1>
        <p>명화를 관찰하고, 패러디하고, AI로 다시 해석하다</p>
      </header>

      <section className="lobby">
        <div className="lobby-title">
          <h2>미술관 로비</h2>
          <p>
            우리들의 작품이 전시된 온라인 미술관입니다.
            <br />
            각 반의 깃발을 선택하여 전시실에 입장해 보세요.
          </p>
        </div>

        <div className="class-grid">
          {classes.map((classNumber) => (
            <div className="class-card" key={classNumber}>
              <div className="flag-area">
                🏳️ {classNumber}반 깃발
              </div>

              <h3>2학년 {classNumber}반</h3>
              <p>학생 작품 전시실</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
