# 감상평 기능 — 구현 및 적용 안내

## 현재 상태
- 독립 브랜치: feature/artwork-comments
- 기준: 운영 배포에서 확인했던 6ae5dcc. 사진 압축 변경은 포함하지 않음.
- 운영 DB에는 SELECT만 실행했고 SQL 적용, 학생 데이터 작성, 코드 변경, 관리자 계정 변경은 하지 않음.
- 새 기능은 NEXT_PUBLIC_ARTWORK_COMMENTS_ENABLED=true일 때만 노출. 기본값은 비활성.
- 테스트 SQL은 독립 PGlite(PostgreSQL) 엔진에서 검증. 실제 Supabase/PostgREST, Vercel 및 기기별 브라우저 통합 검증은 별도 테스트 프로젝트가 필요함.

## 파일
- app/comments/page.js: 대상 작품 검증 및 학생 감상평 페이지
- app/comments/CommentPanel.js: 작성, 받은 감상평, 내가 쓴 글/반려 재작성
- app/comments/comments.module.css: 반응형 스타일
- app/admin/comments/page.js: 검토/통계/작성 횟수 설정
- app/admin/page.js: 메뉴 추가만
- app/class/[classNo]/student/[number]/page.js: 감상평 메뉴 추가만
- database/comments-v1.sql: 검토용 추가 SQL. 운영에서 실행하지 말 것.
- tests/comments/comments-db.test.mjs: 가상 학생만 사용하는 DB 검증
- tests/comments/package.json, tests/comments/package-lock.json: 격리 테스트 의존성

## 데이터 구조
- public.artwork_comments: 기존 artwork UUID, student_access UUID 참조. category/content/status/hidden/검토 메타데이터/version.
- museum_comments_private.settings: 허용 횟수 기본 1, 최대 20.
- museum_comments_private.rate_limits: 학생별 분당 20회. 실패한 인증도 집계. 코드 원문은 저장하지 않음.
- museum_comments_private.review_history: 검토/재작성 이력. 관리자도 본문 수정 API 없음.
- 테이블 직접 권한 없음, RLS 켬. 공개 RPC는 SECURITY INVOKER이며 비공개 스키마의 제한된 함수 호출만 수행.
- 학생은 기존 verify_student_access 및 학급 번호 설정을 검증. 관리자 인증은 기존 reaction_admins_v1 + auth.uid().
- private 스키마를 Supabase Data API 노출 스키마에 추가하지 말 것.

## 정책
- 대상은 승인된 다른 반 작품만. 대상 ID는 링크에서 전달되며 서버에서 재검증.
- 학생별 advisory transaction lock + 작품/작성자 UNIQUE로 동시 중복 방지.
- 반려된 글도 작성 슬롯을 예약하며 같은 글을 재작성할 때 추가 슬롯을 사용하지 않음.
- 작성 횟수를 줄여도 기존 글은 삭제하지 않으며 반려 글의 재작성은 가능.
- 수신자는 자신의 승인된 작품에 대한 승인+비공개 아님 글만 조회. 반환 필드는 id/category/content뿐.
- 작성자 정보는 관리자와 작성자 자신의 목록에만 제공.
- 관리자 승인은 version 일치가 필요하여 학생의 재작성 직후 오래된 화면에서 승인할 수 없음.
- 승인 이후 비공개는 hidden으로 기록. 다시 공개 기능은 1차 범위에서 제외.
- 기능 전체 비활성화는 UI 플래그만으로 보안을 대체하지 않음. RPC 자체 인증/권한 검사가 항상 적용됨.

## 독립 DB 테스트
`cd tests/comments && npm ci && npm test`
테스트용 코드 TEST-1/2/3은 가상 학생 전용이며 실제 학생 코드를 사용하지 않음.
검사: 틀린 코드, 짧은/긴 글, 같은 반/자신/미승인 작품 차단, 중복/총량 제한, 승인 전 비공개, 타인 수신함 차단, 교사 조회·반려·재작성·승인·비공개, 버전 충돌, 작성자 필드 제외, 일반 로그인 사용자 차단, 테이블 직접 접근 차단, 인증 실패 빈도 제한, 기존 가상 행 보존.
PGlite는 단일 연결이므로 여러 DB 연결의 실제 동시성 부하 검증을 대체하지 않음.

## 공유 가능한 통합 테스트에 필요한 것
1. 운영과 분리된 Supabase 테스트 프로젝트. 기존 학생/작품/코드는 복제하지 않음.
2. 기존 테이블/인증 함수 구조만 준비하고 가상 학생·작품·관리자만 생성.
3. comments-v1.sql을 테스트 프로젝트에서 적용. 이미 존재하면 중단하도록 설계되어 임의 덮어쓰기하지 않음.
4. 해당 작업 브랜치 Preview에만 테스트 URL/공개 키와 기능 플래그 설정.
5. 학생 A 작성 → B 승인 전 빈 수신함 → 교사 승인 → B 익명 수신 → 반려/재작성 시나리오 확인.
6. PC/태블릿/모바일 화면, 실제 다중 연결 동시 제출, 기존 업로드·반응 기능 회귀 확인.
7. 결과 확인 및 사용자 승인 전에는 운영 SQL 적용/운영 배포 금지.

## 관리자 사용법
로그인 → 감상평 관리 → 승인 대기 글 확인. 글과 대상 작품 확인 후 승인 또는 사유 입력 후 반려.
부적절한 승인 글은 사유를 적고 비공개 처리.
학생은 '내가 쓴 감상평'에서 개인 코드로 반려 사유 확인 후 재작성.
학급별 표의 작성/수신은 참여 학생 수, 학생별 표는 감상평 개수. 작품별 목록은 '이 작품의 감상평만 보기' 사용.

## 비용/제한
유료 AI API 없음. 저장·조회·테스트 프로젝트 운영에 따른 Supabase/Vercel 사용량은 발생할 수 있음.
새 유료 프로젝트나 요금제를 자동 생성/변경하지 않음.
기존 artworks의 넓은 authenticated 권한과 과거 감상평 RPC는 이번 SQL에서 변경하지 않음. 별도 보안 개선 과제로 남음.
코드가 추측하기 쉬울 경우 기존 인증 함수의 공개 호출도 별도 개선이 필요하며, 새 감상평 함수의 요청 제한만으로 기존 API 전체를 보호하지는 못함.
