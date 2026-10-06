import PeerEncounter from "./learning/PeerEncounter";
import Entrance from "./Entrance";
import LobbyCards from "./LobbyCards";
import styles from "./Lobby.module.css";

export default function Home() {
  return (
    <Entrance>
      <main className={styles.museum}>
        <header className={styles.header}>
          <a href="/" className={styles.brand}>우리들의 온라인 미술관</a>
          <span className={styles.headerNote}>명화에서 시작된, 우리들의 새로운 시선</span>
        </header>
        <section className={styles.lobby} aria-labelledby="lobby-title">
          <div className={styles.title}>
            <p className={styles.eyebrow}>OUR ART MUSEUM · STUDENT EXHIBITION</p>
            <h1 id="lobby-title">상상이 작품이 되는 공간</h1>
            <div className={styles.rule} />
            <p className={styles.description}>명화를 관찰하고, 나만의 이야기로 바꾸고,<br />AI로 색과 표현을 다시 탐구한 우리들의 작품을 만나보세요.</p>
          </div>
          <div className={styles.sectionLabel}><h2>학급 전시실</h2><span>2학년 · 10개의 전시실</span></div>
          <LobbyCards />
          <PeerEncounter />
          <footer className={styles.footer}>관찰에서 상상으로, 상상에서 새로운 표현으로.</footer>
        </section>
      </main>
    </Entrance>
  );
}
