-- REVIEWED TEST CANDIDATE ONLY. Do not apply to production without approval.
-- Additive: never replaces existing museum functions, tables or student codes.
begin;
create schema museum_comments_private;
revoke all on schema museum_comments_private from public;
create table public.artwork_comments (
 id uuid primary key default gen_random_uuid(),
 artwork_id uuid not null references public.artworks(id),
 author_student_id uuid not null references public.student_access(id),
 category text not null check(category in ('idea','color','figure','ai')),
 content text not null check(char_length(btrim(content)) between 10 and 300),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 hidden boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 reviewed_at timestamptz, reviewed_by uuid, rejection_reason text,
 version integer not null default 1,
 unique(artwork_id,author_student_id)
);
create index on public.artwork_comments(author_student_id,status);
create index on public.artwork_comments(status,created_at);
create table museum_comments_private.settings (
 id boolean primary key default true check(id), max_comments integer not null check(max_comments between 1 and 20)
);
insert into museum_comments_private.settings values(true,1);
create table museum_comments_private.rate_limits (
 student_id uuid primary key references public.student_access(id), window_start timestamptz not null, attempts integer not null
);
create table museum_comments_private.review_history (
 id uuid primary key default gen_random_uuid(), comment_id uuid not null references public.artwork_comments(id),
 actor_id uuid, action text not null, content text not null, reason text, created_at timestamptz not null default now()
);
alter table public.artwork_comments enable row level security;
alter table museum_comments_private.settings enable row level security;
alter table museum_comments_private.rate_limits enable row level security;
alter table museum_comments_private.review_history enable row level security;
revoke all on public.artwork_comments from public,anon,authenticated;
revoke all on all tables in schema museum_comments_private from public,anon,authenticated;

create function museum_comments_private.student_action(p_action text,p_class_no integer,p_student_no integer,p_access_code text,p_artwork_id uuid,p_category text,p_content text,p_comment_id uuid,p_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare sid uuid; a public.artworks; c public.artwork_comments; lim integer; attempts integer; result jsonb;
begin
 if p_class_no is null or p_student_no is null or p_access_code is null or length(p_access_code)>100 then return jsonb_build_object('error','학생 접속 정보를 확인해 주세요.'); end if;
 select id into sid from public.student_access where class_no=p_class_no and student_no=p_student_no and active;
 if sid is null then return jsonb_build_object('error','학생 접속 정보를 확인해 주세요.'); end if;
 -- Serialize all operations for this student, including quota checks and retry attempts.
 perform pg_advisory_xact_lock(hashtextextended(sid::text,4901));
 insert into museum_comments_private.rate_limits as r values(sid,clock_timestamp(),1)
 on conflict(student_id) do update set
 attempts=case when r.window_start < clock_timestamp()-interval '1 minute' then 1 else r.attempts+1 end,
 window_start=case when r.window_start < clock_timestamp()-interval '1 minute' then clock_timestamp() else r.window_start end
 returning r.attempts into attempts;
 -- Return errors rather than raising: failed authentication attempts must persist.
 if attempts>20 then return jsonb_build_object('error','요청이 많습니다. 1분 후 다시 시도해 주세요.'); end if;
 if not public.verify_student_access(p_class_no,p_student_no,p_access_code) or not exists(select 1 from public.exhibition_settings_v1 where class_no=p_class_no and p_student_no between 1 and last_student_no) then
 return jsonb_build_object('error','학생 접속 정보를 확인해 주세요.'); end if;
 if p_action='received' then
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'category',x.category,'content',x.content) order by x.created_at),'[]'::jsonb) into result
 from public.artwork_comments x join public.artworks w on w.id=x.artwork_id
 where w.id=p_artwork_id and w.class_no=p_class_no and w.student_no=p_student_no and w.status='approved' and x.status='approved' and not x.hidden;
 if not exists(select 1 from public.artworks where id=p_artwork_id and class_no=p_class_no and student_no=p_student_no and status='approved') then return jsonb_build_object('error','본인의 전시 작품에서만 확인할 수 있습니다.'); end if;
 return jsonb_build_object('comments',result);
 elsif p_action='mine' then
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'artwork_id',x.artwork_id,'class_no',w.class_no,'student_no',w.student_no,'category',x.category,'content',x.content,'status',x.status,'rejection_reason',x.rejection_reason,'version',x.version) order by x.created_at),'[]'::jsonb) into result
 from public.artwork_comments x join public.artworks w on w.id=x.artwork_id where x.author_student_id=sid;
 select max_comments into lim from museum_comments_private.settings where id;
 return jsonb_build_object('comments',result,'limit',lim);
 elsif p_action not in ('submit','resubmit') or p_action is null then return jsonb_build_object('error','지원하지 않는 요청입니다.'); end if;
 if p_category is null or p_category not in ('idea','color','figure','ai') or p_content is null or char_length(btrim(p_content)) not between 10 and 300 then return jsonb_build_object('error','항목을 선택하고 감상평을 10~300자로 작성해 주세요.'); end if;
 select * into a from public.artworks where id=p_artwork_id and status='approved' for share;
 if a.id is null or a.class_no=p_class_no then return jsonb_build_object('error','다른 반 친구의 전시 작품에만 작성할 수 있습니다.'); end if;
 if p_action='resubmit' then
 select * into c from public.artwork_comments where id=p_comment_id and author_student_id=sid and artwork_id=p_artwork_id for update;
 if c.id is null or c.status<>'rejected' or p_version is distinct from c.version then return jsonb_build_object('error','다시 작성 가능한 감상평인지 새로 확인해 주세요.'); end if;
 insert into museum_comments_private.review_history(comment_id,action,content,reason) values(c.id,'resubmitted',c.content,c.rejection_reason);
 update public.artwork_comments set content=btrim(p_content),category=p_category,status='pending',hidden=false,rejection_reason=null,reviewed_at=null,reviewed_by=null,updated_at=now(),version=version+1 where id=c.id;
 return jsonb_build_object('id',c.id);
 end if;
 select max_comments into lim from museum_comments_private.settings where id for share;
 -- Rejected submissions reserve their slot until revised; cannot bypass quota by choosing another work.
 if (select count(*) from public.artwork_comments where author_student_id=sid)>=lim then return jsonb_build_object('error','작성 가능한 횟수를 모두 사용했습니다. 내가 쓴 감상평에서 반려 여부를 확인해 주세요.'); end if;
 if exists(select 1 from public.artwork_comments where author_student_id=sid and artwork_id=p_artwork_id) then return jsonb_build_object('error','이미 이 작품에 감상평을 제출했습니다.'); end if;
 insert into public.artwork_comments(artwork_id,author_student_id,category,content) values(p_artwork_id,sid,p_category,btrim(p_content)) returning id into c.id;
 return jsonb_build_object('id',c.id);
end $$;

create function museum_comments_private.admin_action(p_action text,p_id uuid,p_status text,p_reason text,p_version integer,p_limit integer,p_page integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.artwork_comments; result jsonb; students jsonb; lim integer;
begin
 if auth.uid() is null or not exists(select 1 from public.reaction_admins_v1 where user_id=auth.uid()) then raise exception '관리자 권한이 필요합니다.' using errcode='42501'; end if;
 if p_reason is not null and char_length(p_reason)>300 then raise exception '사유는 300자 이내로 입력해 주세요.'; end if;
 if p_action='settings' then
 if p_limit is null or p_limit not between 1 and 20 then raise exception '허용 횟수는 1~20회입니다.'; end if;
 update museum_comments_private.settings set max_comments=p_limit where id;
 return jsonb_build_object('limit',p_limit);
 elsif p_action='review' then
 select * into c from public.artwork_comments where id=p_id for update;
 if c.id is null or p_version is distinct from c.version then raise exception '내용이 변경되었습니다. 새로고침 후 검토해 주세요.'; end if;
 if p_status is null or p_status not in ('approved','rejected','hidden') then raise exception '검토 상태를 확인해 주세요.'; end if;
 if p_status='hidden' and c.status<>'approved' then raise exception '승인된 감상평만 비공개로 바꿀 수 있습니다.'; end if;
 if p_status in ('approved','rejected') and c.status<>'pending' then raise exception '승인 대기 중인 감상평만 검토할 수 있습니다.'; end if;
 if p_status in ('rejected','hidden') and (p_reason is null or char_length(btrim(p_reason)) not between 1 and 300) then raise exception '사유를 1~300자로 입력해 주세요.'; end if;
 insert into museum_comments_private.review_history(comment_id,actor_id,action,content,reason) values(c.id,auth.uid(),p_status,c.content,p_reason);
 update public.artwork_comments set status=case when p_status='hidden' then status else p_status end,hidden=(p_status='hidden'),rejection_reason=case when p_status='rejected' then btrim(p_reason) else null end,reviewed_at=now(),reviewed_by=auth.uid(),version=version+1,updated_at=now() where id=c.id;
 return jsonb_build_object('ok',true);
 elsif p_action<>'list' or p_action is null then raise exception '지원하지 않는 요청입니다.'; end if;
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into result from (
 select x.*,s.class_no author_class,s.student_no author_number,w.class_no target_class,w.student_no target_number from public.artwork_comments x join public.student_access s on s.id=x.author_student_id join public.artworks w on w.id=x.artwork_id where (p_id is null or x.artwork_id=p_id) order by (x.status='pending') desc,x.created_at desc,x.id limit 50 offset greatest(0,least(coalesce(p_page,0),10000))*50) t;
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into students from (
 select s.class_no,s.student_no,
 (select count(*) from public.artwork_comments x where x.author_student_id=s.id) submitted,
 (select count(*) from public.artwork_comments x where x.author_student_id=s.id and x.status='pending') pending,
 (select count(*) from public.artwork_comments x where x.author_student_id=s.id and x.status='rejected') rejected,
 (select count(*) from public.artwork_comments x join public.artworks w on w.id=x.artwork_id where w.class_no=s.class_no and w.student_no=s.student_no and x.status='approved' and not x.hidden) received
 from public.student_access s join public.exhibition_settings_v1 e on e.class_no=s.class_no where s.active and s.student_no between 1 and e.last_student_no order by s.class_no,s.student_no) t;
 select max_comments into lim from museum_comments_private.settings where id;
 return jsonb_build_object('comments',result,'students',students,'limit',lim,'total',(select count(*) from public.artwork_comments where p_id is null or artwork_id=p_id));
end $$;

create function public.artwork_comments_student_v1(p_action text,p_class_no integer,p_student_no integer,p_access_code text,p_artwork_id uuid default null,p_category text default null,p_content text default null,p_comment_id uuid default null,p_version integer default null)
returns jsonb language sql security invoker set search_path='' as $$ select museum_comments_private.student_action(p_action,p_class_no,p_student_no,p_access_code,p_artwork_id,p_category,p_content,p_comment_id,p_version); $$;
create function public.artwork_comments_admin_v1(p_action text,p_id uuid default null,p_status text default null,p_reason text default null,p_version integer default null,p_limit integer default null,p_page integer default 0)
returns jsonb language sql security invoker set search_path='' as $$ select museum_comments_private.admin_action(p_action,p_id,p_status,p_reason,p_version,p_limit,p_page); $$;
revoke all on all functions in schema museum_comments_private from public,anon,authenticated;
revoke all on function public.artwork_comments_student_v1(text,integer,integer,text,uuid,text,text,uuid,integer) from public;
revoke all on function public.artwork_comments_admin_v1(text,uuid,text,text,integer,integer,integer) from public,anon;
grant usage on schema museum_comments_private to anon,authenticated;
grant execute on function museum_comments_private.student_action(text,integer,integer,text,uuid,text,text,uuid,integer) to anon,authenticated;
grant execute on function museum_comments_private.admin_action(text,uuid,text,text,integer,integer,integer) to authenticated;
grant execute on function public.artwork_comments_student_v1(text,integer,integer,text,uuid,text,text,uuid,integer) to anon,authenticated;
grant execute on function public.artwork_comments_admin_v1(text,uuid,text,text,integer,integer,integer) to authenticated;
commit;
