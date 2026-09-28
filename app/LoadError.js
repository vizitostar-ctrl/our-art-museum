export default function LoadError({ retryHref, message = "연결 문제로 작품을 불러오지 못했습니다." }) {
  return <main style={{minHeight:"60vh",padding:"70px 24px",textAlign:"center",background:"#f7f2e8"}}>
    <h1 style={{fontSize:24}}>잠시 연결을 확인해 주세요</h1><p role="alert">{message}</p>
    <a href={retryHref} style={{display:"inline-block",padding:14,color:"#765b32"}}>다시 불러오기</a> · <a href="/">전체 로비</a>
  </main>;
}
