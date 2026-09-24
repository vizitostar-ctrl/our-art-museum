import Link from "next/link";
import { classes } from "./data";

export default function Home() {
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
          {classes.map((classroom) => (
            <Link
              href={`/class/${classroom.id}`}
              className="class-card"
              key={classroom.id}
            >
              <div className="flag-area">
                {classroom.flag ? (
                  <img
                    src={classroom.flag}
                    alt={`${classroom.name} 깃발`}
                    className="class-flag-image"
                  />
                ) : (
                  <span>🚩 {classroom.id}반 깃발</span>
                )}
              </div>

              <h3>{classroom.name}</h3>
              <p>학생 작품 전시실</p>

              <div className="enter-text">
                전시실 입장 →
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
