import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ClassPage({ params }) {
  const { classNo } = await params;
  const classNumber = Number(classNo);

  if (
    !Number.isInteger(classNumber) ||
    classNumber < 1 ||
    classNumber > 10
  ) {
    notFound();
  }

  const students = Array.from(
    { length: 32 },
    (_, i) => i + 1
  );

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

        <h1>
          2학년 {classNumber}반 전시실
        </h1>

        <p className="classDescription">
          명화를 관찰하고, 패러디하고, AI로 다시 해석한
          <br />
          {classNumber}반 학생들의 작품을 감상해 보세요.
        </p>

      </div>

      <section className="studentGallery">

        {students.map((student) => (

          <Link
            href={`/class/${classNumber}/student/${student}`}
            className="studentCard"
            key={student}
          >

            <div className="artPlaceholder">
              <span>작품 준비 중</span>
            </div>

            <div className="studentInfo">

              <span className="studentNumber">
                2-{classNumber} {student}번
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
