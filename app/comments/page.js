import CommentPanel from './CommentPanel';
import {supabase} from '../supabase';
import Link from 'next/link';
export const dynamic='force-dynamic';
import styles from './comments.module.css';
export default async function CommentsPage({searchParams}) {
 const p=await searchParams;
 if(process.env.NEXT_PUBLIC_ARTWORK_COMMENTS_ENABLED!=='true') return <main className={styles.page}><h1>감상평 기능을 준비하고 있습니다.</h1><a href="/">미술관 로비</a></main>;
 const mode=['write','received','mine'].includes(p.mode)?p.mode:'write';
 if(mode!=='mine'&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.artwork||''))return <main className={styles.page}>작품관의 감상평 버튼으로 접속해 주세요.</main>;
 let target=null;
 if(mode!=='mine'){
  const {data,error}=await supabase.from('artworks').select('class_no,student_no').eq('id',p.artwork).eq('status','approved').maybeSingle();
  if(error||!data)return <main className={styles.page}><p>전시 작품을 확인하지 못했습니다. 작품관에서 다시 접속해 주세요.</p><Link href="/">미술관 로비</Link></main>;
  target=data;
 }
 return <main className={styles.page}>{target&&<p style={{maxWidth:820,margin:'0 auto 20px'}}><Link href={`/class/${target.class_no}/student/${target.student_no}`}>← {target.class_no}반 {target.student_no}번 작품관</Link></p>}<CommentPanel mode={mode} artworkId={p.artwork}/></main>;
}
