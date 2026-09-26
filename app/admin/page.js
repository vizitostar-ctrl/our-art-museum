"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "pending", label: "승인 대기" },
  { value: "approved", label: "승인 완료" },
  { value: "revision", label: "수정 필요" },
  { value: "hidden", label: "숨김" },
];

export default function AdminPage() {
  const router = useRouter();

  const [sessionReady, setSessionReady] = useState(false);
  const [artworks, setArtworks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const [currentFilter, setCurrentFilter] =
    useState("pending");

  const [selectedClass, setSelectedClass] =
    useState("all");

  const [studentInput, setStudentInput] =
    useState("");

  const [studentNumberFilter, setStudentNumberFilter] =
    useState("");

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    approved: 0,
    revision: 0,
    hidden: 0,
    all: 0,
  });

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (!sessionReady) return;

    loadDashboard();
  }, [
    sessionReady,
    currentFilter,
    selectedClass,
    studentNumberFilter,
    page,
  ]);

  async function checkSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      router.replace("/admin/login");
      return;
    }

    setSessionReady(true);
  }

  function applyBaseFilters(query) {
    let filteredQuery = query;

    if (selectedClass !== "all") {
      filteredQuery = filteredQuery.eq(
        "class_no",
        Number(selectedClass)
      );
    }

    if (studentNumberFilter !== "") {
      filteredQuery = filteredQuery.eq(
        "student_no",
        Number(studentNumberFilter)
      );
    }

    return filteredQuery;
  }

  async function getCount(status) {
    let query = supabase
      .from("artworks")
      .select("id", {
        count: "exact",
        head: true,
      });

    query = applyBaseFilters(query);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { count, error } = await query;

    if (error) {
      throw error;
    }

    return count || 0;
  }

  async function loadDashboard() {
    try {
      setIsLoading(true);

      const start = (page - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      let artworkQuery = supabase
        .from("artworks")
        .select("*", {
          count: "exact",
        });

      artworkQuery = applyBaseFilters(artworkQuery);

      if (currentFilter !== "all") {
        artworkQuery = artworkQuery.eq(
          "status",
          currentFilter
        );
      }

      artworkQuery = artworkQuery
        .order("class_no", {
          ascending: true,
        })
        .order("student_no", {
          ascending: true,
        })
        .order("created_at", {
          ascending: false,
        })
        .range(start, end);

      const [
        pendingCount,
        approvedCount,
        revisionCount,
        hiddenCount,
        allCount,
        artworkResult,
      ] = await Promise.all([
        getCount("pending"),
        getCount("approved"),
        getCount("revision"),
        getCount("hidden"),
        getCount("all"),
        artworkQuery,
      ]);

      if (artworkResult.error) {
        throw artworkResult.error;
      }

      setStatusCounts({
        pending: pendingCount,
        approved: approvedCount,
        revision: revisionCount,
        hidden: hiddenCount,
        all: allCount,
      });

      setArtworks(artworkResult.data || []);
      setTotalCount(artworkResult.count || 0);

      const calculatedTotalPages = Math.max(
        1,
        Math.ceil(
          (artworkResult.count || 0) / PAGE_SIZE
        )
      );

      if (page > calculatedTotalPages) {
        setPage(calculatedTotalPages);
      }
    } catch (error) {
      console.error(error);
      alert("작품 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  function changeStatusFilter(status) {
    setCurrentFilter(status);
    setPage(1);
  }

  function changeClassFilter(event) {
    setSelectedClass(event.target.value);
    setPage(1);
  }

  function handleStudentSearch(event) {
    event.preventDefault();

    const value = studentInput.trim();

    if (value === "") {
      setStudentNumberFilter("");
      setPage(1);
      return;
    }

    const studentNumber = Number(value);

    if (
      !Number.isInteger(studentNumber) ||
      studentNumber < 1 ||
      studentNumber > 50
    ) {
      alert(
        "학생 번호는 1번부터 50번 사이로 입력해 주세요."
      );
      return;
    }

    setStudentNumberFilter(
      String(studentNumber)
    );
    setPage(1);
  }

  function clearStudentSearch() {
    setStudentInput("");
    setStudentNumberFilter("");
    setPage(1);
  }

  async function changeStatus(id, newStatus) {
    try {
      setUpdatingId(id);

      const { error } = await supabase
        .from("artworks")
        .update({
          status: newStatus,
        })
        .eq("id", id);

      if (error) {
        throw error;
      }

      await loadDashboard();
    } catch (error) {
      console.error(error);
      alert("작품 상태 변경에 실패했습니다.");
    } finally {
      setUpdatingId(null);
    }
  }

  function getArtworkStoragePath(publicUrl) {
    if (!publicUrl) return null;

    const marker =
      "/storage/v1/object/public/artworks/";

    const markerIndex =
      publicUrl.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const path = publicUrl
      .slice(markerIndex + marker.length)
      .split("?")[0];

    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  }


  async function deleteArtwork(artwork) {
    const confirmed = window.confirm(
      `2학년 ${artwork.class_no}반 ${artwork.student_no}번 작품을 정말 삭제하시겠습니까?\n\n` +
      "삭제하면 전시 및 관리자 목록에서 제거됩니다.\n" +
      "삭제 후 학생은 접속코드를 이용해 작품을 다시 제출할 수 있습니다."
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingId(artwork.id);

      /*
        먼저 삭제할 이미지들의 Storage 경로를 확보합니다.
      */
      const storagePaths = [
        getArtworkStoragePath(
          artwork.original_url
        ),
        getArtworkStoragePath(
          artwork.parody_url
        ),
        getArtworkStoragePath(
          artwork.ai_url
        ),
      ].filter(Boolean);


      /*
        1. artworks 테이블에서 작품 삭제
      */
      const { error: deleteError } =
        await supabase
          .from("artworks")
          .delete()
          .eq("id", artwork.id);

      if (deleteError) {
        throw new Error(
          `작품 삭제 실패: ${deleteError.message}`
        );
      }


      /*
        2. Storage에 남아 있는 이미지 정리

        DB 삭제는 성공했지만 이미지 삭제가 실패하더라도
        작품 자체는 이미 정상 삭제된 상태이므로
        관리자에게만 알려 줍니다.
      */
      if (storagePaths.length > 0) {
        const uniquePaths = [
          ...new Set(storagePaths),
        ];

        const { error: storageError } =
          await supabase.storage
            .from("artworks")
            .remove(uniquePaths);

        if (storageError) {
          console.error(
            "Storage 이미지 삭제 실패:",
            storageError
          );

          alert(
            "작품은 삭제되었습니다.\n\n" +
            "다만 일부 이미지 파일 정리에 실패했습니다."
          );
        } else {
          alert(
            "작품과 이미지가 정상적으로 삭제되었습니다."
          );
        }
      } else {
        alert(
          "작품이 정상적으로 삭제되었습니다."
        );
      }

      await loadDashboard();

    } catch (error) {
      console.error(error);

      alert(
        "작품 삭제 중 문제가 발생했습니다.\n\n" +
        (error?.message ||
          "잠시 후 다시 시도해 주세요.")
      );
    } finally {
      setUpdatingId(null);
    }
  }
  
  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  function formatDate(dateString) {
    if (!dateString) return "";

    return new Date(dateString).toLocaleString(
      "ko-KR",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function getStatusLabel(status) {
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

  function getStatusBackground(status) {
    if (status === "approved") {
      return "#e8f4e7";
    }

    if (status === "revision") {
      return "#fff1d9";
    }

    if (status === "hidden") {
      return "#eeeeee";
    }

    return "#f4eadf";
  }

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PAGE_SIZE)
  );

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  );

  if (!sessionReady) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f7f2e8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6e6255",
        }}
      >
        로그인 상태를 확인하는 중입니다...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f2e8",
        padding: "40px 20px 80px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        {/* 상단 */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "20px",
            marginBottom: "36px",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "12px",
                letterSpacing: "0.18em",
                fontWeight: "700",
                color: "#9a7b55",
              }}
            >
              TEACHER ADMIN
            </span>

            <h1
              style={{
                margin: "10px 0",
                fontSize: "34px",
                color: "#17120e",
              }}
            >
              작품 승인 관리
            </h1>

            <p
              style={{
                margin: 0,
                color: "#75695d",
                lineHeight: 1.7,
              }}
            >
              반과 학생 번호를 선택하여
              필요한 작품만 확인할 수 있습니다.
              <br />
              한 화면에는 최대 20명의 작품만
              불러옵니다.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              border: "1px solid #d5c8b6",
              background: "#fffdfa",
              borderRadius: "999px",
              padding: "10px 18px",
              cursor: "pointer",
              fontWeight: "700",
            }}
          >
            로그아웃
          </button>
        </header>

        {/* 상태 요약 */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                changeStatusFilter(option.value)
              }
              style={{
                textAlign: "left",
                padding: "20px",
                border:
                  currentFilter === option.value
                    ? "2px solid #4b392a"
                    : "1px solid #ddd1bf",
                borderRadius: "16px",
                background: "#fffdfa",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#8c7965",
                  fontSize: "13px",
                }}
              >
                {option.label}
              </span>

              <strong
                style={{
                  fontSize: "28px",
                  color: "#1d1712",
                }}
              >
                {statusCounts[option.value]}
              </strong>
            </button>
          ))}
        </section>

        {/* 검색 / 반 필터 */}
        <section
          style={{
            background: "#fffdfa",
            border: "1px solid #ddd1bf",
            borderRadius: "18px",
            padding: "20px",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "end",
              gap: "14px",
            }}
          >
            <label
              style={{
                minWidth: "180px",
                fontWeight: "700",
                color: "#30281f",
              }}
            >
              반 선택

              <select
                value={selectedClass}
                onChange={changeClassFilter}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "8px",
                  padding: "11px 12px",
                  border: "1px solid #d5c8b6",
                  borderRadius: "10px",
                  background: "#ffffff",
                  fontSize: "14px",
                }}
              >
                <option value="all">
                  전체 반
                </option>

                {Array.from(
                  { length: 10 },
                  (_, index) => index + 1
                ).map((classNumber) => (
                  <option
                    key={classNumber}
                    value={classNumber}
                  >
                    2학년 {classNumber}반
                  </option>
                ))}
              </select>
            </label>

            <form
              onSubmit={handleStudentSearch}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "end",
                gap: "8px",
                flex: "1 1 360px",
              }}
            >
              <label
                style={{
                  flex: "1 1 180px",
                  fontWeight: "700",
                  color: "#30281f",
                }}
              >
                학생 번호 검색

                <input
                  type="number"
                  min="1"
                  max="50"
                  value={studentInput}
                  onChange={(event) =>
                    setStudentInput(
                      event.target.value
                    )
                  }
                  placeholder="예: 12"
                  style={{
                    display: "block",
                    boxSizing: "border-box",
                    width: "100%",
                    marginTop: "8px",
                    padding: "11px 12px",
                    border: "1px solid #d5c8b6",
                    borderRadius: "10px",
                    fontSize: "14px",
                  }}
                />
              </label>

              <button
                type="submit"
                style={{
                  border: "none",
                  borderRadius: "999px",
                  padding: "11px 18px",
                  background: "#211a14",
                  color: "#ffffff",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                검색
              </button>

              <button
                type="button"
                onClick={clearStudentSearch}
                style={{
                  border: "1px solid #d5c8b6",
                  borderRadius: "999px",
                  padding: "10px 16px",
                  background: "#fffdfa",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                검색 초기화
              </button>
            </form>
          </div>

          <div
            style={{
              marginTop: "18px",
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() =>
                changeStatusFilter("all")
              }
              style={{
                border:
                  currentFilter === "all"
                    ? "2px solid #4b392a"
                    : "1px solid #d5c8b6",
                background: "#fffdfa",
                borderRadius: "999px",
                padding: "9px 16px",
                cursor: "pointer",
                fontWeight: "700",
              }}
            >
              전체 상태 {statusCounts.all}
            </button>

            {selectedClass !== "all" && (
              <span
                style={{
                  padding: "8px 13px",
                  borderRadius: "999px",
                  background: "#f3eadf",
                  fontSize: "13px",
                  fontWeight: "700",
                }}
              >
                2학년 {selectedClass}반
              </span>
            )}

            {studentNumberFilter !== "" && (
              <span
                style={{
                  padding: "8px 13px",
                  borderRadius: "999px",
                  background: "#f3eadf",
                  fontSize: "13px",
                  fontWeight: "700",
                }}
              >
                {studentNumberFilter}번 검색 중
              </span>
            )}
          </div>
        </section>

        {/* 현재 조회 정보 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "16px",
            color: "#76695c",
            fontSize: "14px",
          }}
        >
          <span>
            검색 결과 총 <strong>{totalCount}</strong>개
          </span>

          <span>
            한 페이지 최대 {PAGE_SIZE}개 ·
            {page} / {totalPages} 페이지
          </span>
        </div>

        {/* 작품 목록 */}
        {isLoading ? (
          <section
            style={{
              background: "#fffdfa",
              border: "1px solid #ddd1bf",
              borderRadius: "18px",
              padding: "50px 24px",
              textAlign: "center",
              color: "#776b5e",
            }}
          >
            작품 목록을 불러오는 중입니다...
          </section>
        ) : artworks.length === 0 ? (
          <section
            style={{
              background: "#fffdfa",
              border: "1px solid #ddd1bf",
              borderRadius: "18px",
              padding: "50px 24px",
              textAlign: "center",
              color: "#776b5e",
            }}
          >
            현재 조건에 해당하는 작품이 없습니다.
          </section>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "24px",
            }}
          >
            {artworks.map((artwork) => (
              <article
                key={artwork.id}
                style={{
                  background: "#fffdfa",
                  border: "1px solid #ddd1bf",
                  borderRadius: "20px",
                  padding: "24px",
                }}
              >
                {/* 기본 정보 */}
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "flex-start",
                    gap: "20px",
                    marginBottom: "22px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#9a7b55",
                        fontWeight: "700",
                        letterSpacing: "0.1em",
                      }}
                    >
                      STUDENT ARTWORK
                    </span>

                    <h2
                      style={{
                        margin: "7px 0 4px",
                        fontSize: "24px",
                      }}
                    >
                      2-{artwork.class_no}{" "}
                      {artwork.student_no}번 작품
                    </h2>

                    <p
                      style={{
                        margin: 0,
                        color: "#887b6d",
                        fontSize: "13px",
                      }}
                    >
                      제출일:{" "}
                      {formatDate(
                        artwork.created_at
                      )}
                    </p>
                  </div>

                  <span
                    style={{
                      display: "inline-block",
                      borderRadius: "999px",
                      padding: "8px 13px",
                      background:
                        getStatusBackground(
                          artwork.status
                        ),
                      fontSize: "13px",
                      fontWeight: "700",
                    }}
                  >
                    {getStatusLabel(
                      artwork.status
                    )}
                  </span>
                </div>

                {/* 이미지 3장 */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                    marginBottom: "24px",
                  }}
                >
                  {[
                    [
                      "원작",
                      artwork.original_url,
                    ],
                    [
                      "나의 패러디",
                      artwork.parody_url,
                    ],
                    [
                      "AI 재해석",
                      artwork.ai_url,
                    ],
                  ].map(([label, url]) => (
                    <div
                      key={label}
                      style={{
                        border:
                          "1px solid #e0d5c5",
                        borderRadius: "14px",
                        overflow: "hidden",
                        background: "#f3ede3",
                      }}
                    >
                      <div
                        style={{
                          height: "220px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "center",
                        }}
                      >
                        {url ? (
                          <img
                            src={url}
                            alt={label}
                            loading="lazy"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit:
                                "contain",
                            }}
                          />
                        ) : (
                          <span>
                            {label}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          padding: "12px 14px",
                          background: "#fffdfa",
                          fontWeight: "700",
                        }}
                      >
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 작품 설명 */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "14px",
                    marginBottom: "24px",
                  }}
                >
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "14px",
                      background: "#faf6ef",
                    }}
                  >
                    <strong>
                      원작에서 발견한 특징
                    </strong>

                    <p
                      style={{
                        marginBottom: 0,
                        lineHeight: 1.7,
                        color: "#665b50",
                      }}
                    >
                      {artwork.feature}
                    </p>
                  </div>

                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "14px",
                      background: "#faf6ef",
                    }}
                  >
                    <strong>
                      나의 표현 의도
                    </strong>

                    <p
                      style={{
                        marginBottom: 0,
                        lineHeight: 1.7,
                        color: "#665b50",
                      }}
                    >
                      {artwork.intent}
                    </p>
                  </div>

                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "14px",
                      background: "#faf6ef",
                    }}
                  >
                    <strong>
                      AI에게 전달한 표현 특징
                    </strong>

                    <p
                      style={{
                        marginBottom: 0,
                        lineHeight: 1.7,
                        color: "#665b50",
                      }}
                    >
                      {artwork.prompt_text}
                    </p>
                  </div>
                </div>

                {/* 상태 변경 버튼 */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    disabled={
                      updatingId === artwork.id
                    }
                    onClick={() =>
                      changeStatus(
                        artwork.id,
                        "approved"
                      )
                    }
                    style={{
                      border: "none",
                      borderRadius: "999px",
                      padding: "11px 18px",
                      background: "#263b28",
                      color: "#ffffff",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    ✓ 승인
                  </button>

                  <button
                    type="button"
                    disabled={
                      updatingId === artwork.id
                    }
                    onClick={() =>
                      changeStatus(
                        artwork.id,
                        "revision"
                      )
                    }
                    style={{
                      border:
                        "1px solid #d5b77d",
                      borderRadius: "999px",
                      padding: "11px 18px",
                      background: "#fff7e9",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    ↺ 수정 필요
                  </button>

                  <button
                    type="button"
                    disabled={
                      updatingId === artwork.id
                    }
                    onClick={() =>
                      changeStatus(
                        artwork.id,
                        "hidden"
                      )
                    }
                    style={{
                      border:
                        "1px solid #cfc8c0",
                      borderRadius: "999px",
                      padding: "11px 18px",
                      background: "#f2f0ed",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    숨김
                  </button>

                  <button
                    type="button"
                    disabled={
                      updatingId === artwork.id
                    }
                    onClick={() =>
                      changeStatus(
                        artwork.id,
                        "pending"
                      )
                    }
                    style={{
                      border:
                        "1px solid #d7c8b7",
                      borderRadius: "999px",
                      padding: "11px 18px",
                      background: "#fffdfa",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    승인 대기로 변경
                  </button>

                  <button
                    type="button"
                    disabled={
                      updatingId === artwork.id
                    }
                    onClick={() =>
                      deleteArtwork(artwork)
                    }
                    style={{
                      border:
                        "1px solid #d8a6a1",
                      borderRadius: "999px",
                      padding: "11px 18px",
                      background: "#fff1f0",
                      color: "#9c3028",
                      fontWeight: "700",
                      cursor:
                        updatingId === artwork.id
                          ? "default"
                          : "pointer",
                      opacity:
                        updatingId === artwork.id
                          ? 0.6
                          : 1,
                    }}
                  >
                    🗑 작품 삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* 페이지 이동 */}
        {totalCount > PAGE_SIZE && (
          <nav
            style={{
              marginTop: "30px",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <button
              type="button"
              disabled={page === 1}
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1)
                )
              }
              style={{
                border: "1px solid #d5c8b6",
                borderRadius: "999px",
                padding: "9px 14px",
                background: "#fffdfa",
                cursor:
                  page === 1
                    ? "default"
                    : "pointer",
                opacity:
                  page === 1 ? 0.45 : 1,
              }}
            >
              ← 이전
            </button>

            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() =>
                  setPage(pageNumber)
                }
                style={{
                  minWidth: "38px",
                  height: "38px",
                  border:
                    page === pageNumber
                      ? "2px solid #4b392a"
                      : "1px solid #d5c8b6",
                  borderRadius: "50%",
                  background:
                    page === pageNumber
                      ? "#4b392a"
                      : "#fffdfa",
                  color:
                    page === pageNumber
                      ? "#ffffff"
                      : "#231b15",
                  cursor: "pointer",
                  fontWeight: "700",
                }}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              disabled={page === totalPages}
              onClick={() =>
                setPage((current) =>
                  Math.min(
                    totalPages,
                    current + 1
                  )
                )
              }
              style={{
                border: "1px solid #d5c8b6",
                borderRadius: "999px",
                padding: "9px 14px",
                background: "#fffdfa",
                cursor:
                  page === totalPages
                    ? "default"
                    : "pointer",
                opacity:
                  page === totalPages
                    ? 0.45
                    : 1,
              }}
            >
              다음 →
            </button>
          </nav>
        )}
      </div>
    </main>
  );
}
