"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase";

export default function AdminPage() {
  const router = useRouter();

  const [artworks, setArtworks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState("pending");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    checkLoginAndLoad();
  }, []);

  async function checkLoginAndLoad() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/admin/login");
      return;
    }

    await loadArtworks();
  }

  async function loadArtworks() {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("artworks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setArtworks(data || []);
    } catch (error) {
      console.error(error);
      alert("작품 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
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

      setArtworks((current) =>
        current.map((artwork) =>
          artwork.id === id
            ? { ...artwork, status: newStatus }
            : artwork
        )
      );
    } catch (error) {
      console.error(error);
      alert("작품 상태 변경에 실패했습니다.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  const filteredArtworks = artworks.filter((artwork) => {
    if (currentFilter === "all") return true;
    return artwork.status === currentFilter;
  });

  const countByStatus = (status) =>
    artworks.filter((artwork) => artwork.status === status).length;

  function formatDate(dateString) {
    if (!dateString) return "";

    return new Date(dateString).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (isLoading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f7f2e8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          color: "#6e6255",
        }}
      >
        작품 목록을 불러오는 중입니다...
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
              학생이 제출한 작품을 확인하고
              전시 여부를 결정할 수 있습니다.
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
            marginBottom: "30px",
          }}
        >
          {[
            ["pending", "승인 대기"],
            ["approved", "승인 완료"],
            ["revision", "수정 필요"],
            ["hidden", "숨김"],
          ].map(([status, label]) => (
            <button
              key={status}
              type="button"
              onClick={() => setCurrentFilter(status)}
              style={{
                textAlign: "left",
                padding: "20px",
                border:
                  currentFilter === status
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
                {label}
              </span>

              <strong
                style={{
                  fontSize: "28px",
                  color: "#1d1712",
                }}
              >
                {countByStatus(status)}
              </strong>
            </button>
          ))}
        </section>

        <div
          style={{
            marginBottom: "24px",
          }}
        >
          <button
            type="button"
            onClick={() => setCurrentFilter("all")}
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
            전체 작품 {artworks.length}
          </button>
        </div>

        {/* 작품 목록 */}
        {filteredArtworks.length === 0 ? (
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
            현재 해당 상태의 작품이 없습니다.
          </section>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "24px",
            }}
          >
            {filteredArtworks.map((artwork) => (
              <article
                key={artwork.id}
                style={{
                  background: "#fffdfa",
                  border: "1px solid #ddd1bf",
                  borderRadius: "20px",
                  padding: "24px",
                }}
              >
                {/* 작품 기본 정보 */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
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
                      제출일: {formatDate(artwork.created_at)}
                    </p>
                  </div>

                  <span
                    style={{
                      display: "inline-block",
                      borderRadius: "999px",
                      padding: "8px 13px",
                      background:
                        artwork.status === "approved"
                          ? "#e8f4e7"
                          : artwork.status === "revision"
                          ? "#fff1d9"
                          : artwork.status === "hidden"
                          ? "#eeeeee"
                          : "#f4eadf",
                      fontSize: "13px",
                      fontWeight: "700",
                    }}
                  >
                    {artwork.status === "approved"
                      ? "승인 완료"
                      : artwork.status === "revision"
                      ? "수정 필요"
                      : artwork.status === "hidden"
                      ? "숨김"
                      : "승인 대기"}
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
                    ["원작", artwork.original_url],
                    ["나의 패러디", artwork.parody_url],
                    ["AI 재해석", artwork.ai_url],
                  ].map(([label, url]) => (
                    <div
                      key={label}
                      style={{
                        border: "1px solid #e0d5c5",
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
                          justifyContent: "center",
                        }}
                      >
                        {url ? (
                          <img
                            src={url}
                            alt={label}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <span>{label}</span>
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
                    <strong>원작에서 발견한 특징</strong>
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
                    <strong>나의 표현 의도</strong>
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
                    <strong>AI에게 전달한 표현 특징</strong>
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
                    disabled={updatingId === artwork.id}
                    onClick={() =>
                      changeStatus(artwork.id, "approved")
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
                    disabled={updatingId === artwork.id}
                    onClick={() =>
                      changeStatus(artwork.id, "revision")
                    }
                    style={{
                      border: "1px solid #d5b77d",
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
                    disabled={updatingId === artwork.id}
                    onClick={() =>
                      changeStatus(artwork.id, "hidden")
                    }
                    style={{
                      border: "1px solid #cfc8c0",
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
                    disabled={updatingId === artwork.id}
                    onClick={() =>
                      changeStatus(artwork.id, "pending")
                    }
                    style={{
                      border: "1px solid #d7c8b7",
                      borderRadius: "999px",
                      padding: "11px 18px",
                      background: "#fffdfa",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    승인 대기로 변경
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
