"use client";
import {useState,useEffect,useRef} from 'react';
import Link from 'next/link';
import {supabase} from '../../supabase';
import {categories} from '../../comments/CommentPanel';
import styles from '../../comments/comments.module.css';
export default function AdminComments(){
 const [data,setData]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[reasons,setReasons]=useState({});
 const [limit,setLimit]=useState(1),[page,setPage]=useState(0),[classNo,setClassNo]=useState('all'),[artwork,setArtwork]=useState('');
 const lock=useRef(false),request=useRef(0);
 const enabled=process.env.NEXT_PUBLIC_ARTWORK_COMMENTS_ENABLED==='true';
 async function rpc(action,extra={}){
  const {data,error}=await supabase.rpc('artwork_comments_admin_v1',{p_action:action,p_page:page,p_id:artwork||null,...extra});
  if(error)throw new Error(error.message||'관리자 권한을 확인해 주세요.');return data;
 }
 async function load(){const id=++request.current;setMessage('');try{const next=await rpc('list');if(id===request.current){setData(next);setLimit(next.limit);}}catch(e){if(id===request.current){setData(null);setMessage(e.message);}}}
 useEffect(()=>{if(enabled)load();return()=>{request.current++;};},[page,artwork]);
 useEffect(()=>{const {data:{subscription}}=supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){request.current++;setData(null);setMessage('다시 로그인해 주세요.');}});return()=>subscription.unsubscribe();},[]);
 async function change(action,extra){if(lock.current)return;lock.current=true;setBusy(true);try{await rpc(action,extra);setReasons({});await load();setMessage('처리되었습니다.');}catch(e){setMessage(e.message);}finally{lock.current=false;setBusy(false);}}
 const students=(data?.students||[]).filter(x=>classNo==='all'||x.class_no===Number(classNo));
 const groups=Array.from({length:10},(_,i)=>{const rows=(data?.students||[]).filter(s=>s.class_no===i+1);return {classNo:i+1,total:rows.length,wrote:rows.filter(s=>s.submitted>0).length,received:rows.filter(s=>s.received>0).length,pending:rows.reduce((a,s)=>a+Number(s.pending),0)};});
 return <main className={styles.page}><section className={styles.panel}>
 <Link href="/admin">← 관리자 페이지</Link><h1>감상평 관리</h1>
 {!enabled?<p>감상평 기능을 준비하고 있습니다.</p>:<>
 <p>감상평의 문장은 수정하지 않습니다. 반려 사유를 적으면 학생이 고쳐 다시 제출할 수 있습니다.</p>
 {message&&<p role="status" className={styles.notice}>{message}</p>}
 {!data?<><Link href="/admin/login">관리자 로그인</Link><button onClick={load}>다시 확인</button></>:<>
 <form onSubmit={e=>{e.preventDefault();change('settings',{p_limit:Number(limit)});}}><label>학생 1명당 작성 허용 횟수<input type="number" min="1" max="20" required value={limit} onChange={e=>setLimit(e.target.value)}/></label><p>반려된 글도 횟수에 포함됩니다. 같은 글을 다시 제출할 때는 횟수가 늘어나지 않습니다. 횟수를 줄여도 기존 글은 삭제되지 않습니다.</p><button disabled={busy}>횟수 저장</button></form>
 <h2>학급별 참여 현황</h2><div className={styles.scroll}><table><thead><tr><th>반</th><th>학생 수</th><th>작성 학생</th><th>수신 학생</th><th>검토 대기</th></tr></thead><tbody>{groups.map(g=><tr key={g.classNo}><td>{g.classNo}반</td><td>{g.total}</td><td>{g.wrote}</td><td>{g.received}</td><td>{g.pending}</td></tr>)}</tbody></table></div>
 <h2>학생별 작성·수신 현황</h2><label>학급 선택<select value={classNo} onChange={e=>setClassNo(e.target.value)}><option value="all">전체 학급</option>{groups.map(g=><option key={g.classNo} value={g.classNo}>{g.classNo}반</option>)}</select></label>
 <div className={styles.scroll}><table><thead><tr><th>반·번호</th><th>작성</th><th>대기</th><th>반려</th><th>승인된 수신</th></tr></thead><tbody>{students.map(s=><tr key={`${s.class_no}-${s.student_no}`}><td>{s.class_no}반 {s.student_no}번</td><td>{s.submitted}</td><td>{s.pending}</td><td>{s.rejected}</td><td>{s.received}</td></tr>)}</tbody></table></div>
 <h2>감상평 목록 · {data.total}개</h2><p>승인 대기 글이 먼저 표시됩니다. 한 페이지에 최대 50개입니다.</p>
 {artwork&&<button onClick={()=>{setArtwork('');setPage(0);}}>작품 필터 해제</button>}
 {!data.comments.length&&<p>감상평이 없습니다.</p>}
 {data.comments.map(c=><article key={c.id} className={styles.card}><h2>{c.author_class}반 {c.author_number}번 → {c.target_class}반 {c.target_number}번 작품</h2>
 <p>{categories[c.category]} · {c.hidden?'비공개':({pending:'승인 대기',approved:'승인',rejected:'반려'})[c.status]}</p><p className={styles.body}>{c.content}</p>
 <div className={styles.actions}><Link href={`/class/${c.target_class}/student/${c.target_number}`}>작품 보기</Link><button onClick={()=>{setArtwork(c.artwork_id);setPage(0);}}>이 작품의 감상평만 보기</button></div>
 {c.rejection_reason&&<p>반려 사유: {c.rejection_reason}</p>}
 {(c.status==='pending'||(c.status==='approved'&&!c.hidden))&&<><label>반려·비공개 사유<textarea maxLength={300} rows={2} value={reasons[c.id]||''} onChange={e=>setReasons({...reasons,[c.id]:e.target.value})}/></label><div className={styles.actions}>
 {c.status==='pending'?<><button disabled={busy} onClick={()=>change('review',{p_id:c.id,p_status:'approved',p_version:c.version})}>승인</button><button disabled={busy||!reasons[c.id]?.trim()} onClick={()=>change('review',{p_id:c.id,p_status:'rejected',p_reason:reasons[c.id],p_version:c.version})}>사유와 함께 반려</button></>:<button disabled={busy||!reasons[c.id]?.trim()} onClick={()=>change('review',{p_id:c.id,p_status:'hidden',p_reason:reasons[c.id],p_version:c.version})}>비공개 처리</button>}
 </div></>}
 </article>)}
 <div className={styles.actions}><button disabled={busy||page===0} onClick={()=>setPage(page-1)}>이전</button><span>{page+1}페이지</span><button disabled={busy||(page+1)*50>=data.total} onClick={()=>setPage(page+1)}>다음</button><button disabled={busy} onClick={load}>새로고침</button></div>
 </>}
 </>}
 </section></main>;
}
