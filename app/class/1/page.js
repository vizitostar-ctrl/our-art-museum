import Link from "next/link";

export default function Class1Page() {
  const students = Array.from({ length: 32 }, (_, i) => i + 1);

  return (
    <main className="classroom">

      <div className="classHeader">

        <Link href="/" className="backButton">
          ← 미술관 로비
        </Link>

        <div className="classFlag">
          🚩
        </div>

        <p className="classLabel">
          우리들의 온라인 미술관
        </p>

        <h1>2학년 1반 전시실</h1>

        <p className="classDescription">
          명화를 관찰하고, 패러디하고, AI로 다시 해석한
          <br />
          1반 학생들의 작품을 감상해 보세요.
        </p>

      </div>

      <section className="studentGallery">

        {students.map((student) => (

          <Link
            href={`/class/1/student/${student}`}
            className="studentCard"
            key={student}
          >

            <div className="artPlaceholder">
              <span>작품 준비 중</span>
            </div>

            <div className="studentInfo">

              <span className="studentNumber">
                2-1 {student}번
              </span>

              <h2>학생 작품</h2>

              <p>
                원작 · 패러디 · AI 재해석
              </p>

            </div>

          </Link>

        ))}

      </section>

    </main>
  );
}
