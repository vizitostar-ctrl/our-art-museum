import "./globals.css";

export const metadata = {
  title: "우리들의 온라인 미술관",
  description: "학생들의 명화 패러디와 AI 재해석 작품 전시관",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
