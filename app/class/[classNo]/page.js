import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  /*
    현재 반에서 승인된 작품만 가져옵니다.
    같은 학생이 여러 번 제출한 경우
    가장 최근 승인 작품을 사용합니다.
  */
  const { data: approvedArtworks, error } =
    await supabase
      .from("artworks")
      .select(
        "student_no, original_url, parody_url, ai_url, created_at"
      )
      .eq("class_no", classNumber)
      .eq("status", "approved")
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    console.error(
      "전시실 작품 불러오기 오류:",
      error
    );
  }

  /*
    학생 번호별로 가장 최근 승인 작품 1개씩 저장
  */
  const artworkByStudent = new Map();

  for (const artwork of approvedArtworks || []) {
    if (
      !artworkByStudent.has(
        artwork.student_no
      )
    ) {
      artworkByStudent.set(
        artwork.student_no,
        artwork
      );
    }
  }

  return (
    <main className="classroom">

      <div className="classHeader">

        <Link
          href="/"
          className="backButton"
        >
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
          명화를 관찰하고, 패러디하고,
          AI로 다시 해석한
          <br />
          {classNumber}반 학생들의 작품을
          감상해 보세요.
        </p>

      </div>

      <section className="studentGallery">

        {students.map((student) => {
          const artwork =
            artworkByStudent.get(student);

          /*
            대표 이미지는 학생이 직접 만든
            패러디 작품을 가장 먼저 사용합니다.
          */
          const thumbnail =
            artwork?.parody_url ||
            artwork?.ai_url ||
            artwork?.original_url;

          return (
            <Link
              href={`/class/${classNumber}/student/${student}`}
              className="studentCard"
              key={student}
            >

              <div className="artPlaceholder">

                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={`2-${classNumber} ${student}번 작품 미리보기`}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block",
                      background: "#ebe5da",
                    }}
                  />
                ) : (
                  <span>
                    작품 준비 중
                  </span>
                )}

              </div>

              <div className="studentInfo">

                <span className="studentNumber">
                  2-{classNumber} {student}번
                </span>

                <h2>
                  {thumbnail
                    ? "전시 중인 작품"
                    : "학생 작품"}
                </h2>

                <p>
                  원작 · 패러디 · AI 재해석
                </p>

              </div>

            </Link>
          );
        })}

      </section>

    </main>
  );
}
