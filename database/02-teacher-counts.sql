-- Teacher/project-owner only: run in SQL Editor. No public rankings or counts.
select a.class_no as "반", a.student_no as "번호", a.id as "작품ID",
 count(*) filter (where r.kind='heart') as "마음에 와닿아요",
 count(*) filter (where r.kind='color') as "색채가 인상적이에요",
 count(*) filter (where r.kind='idea') as "아이디어가 재미있어요"
from public.artworks a
left join public.artwork_reactions_v1 r on r.artwork_id=a.id::text
where a.status='approved'
group by a.class_no,a.student_no,a.id
order by a.class_no,a.student_no,a.id;
