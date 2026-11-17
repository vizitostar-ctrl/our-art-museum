create table public.museum_learning_v1 (
 class_no integer not null, student_no integer not null,
 payload jsonb not null default '{}'::jsonb, version integer not null default 0,
 artwork_id text, public_approved boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(class_no,student_no)
);
alter table public.museum_learning_v1 enable row level security;
revoke all on public.museum_learning_v1 from public, anon, authenticated;
alter table public.artworks alter column id set default gen_random_uuid();
CREATE OR REPLACE FUNCTION public.check_exhibition_student_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare last_no integer;
begin
 select last_student_no into last_no from public.exhibition_settings_v1 where class_no=new.class_no for share;
 if last_no is null or new.student_no is null or new.student_no<1 or new.student_no>last_no then
  raise exception 'Student number outside configured class' using errcode='22023';
 end if;
 return new;
end; $function$
;
CREATE OR REPLACE FUNCTION public.get_my_learning_v1(p_class_no integer, p_student_no integer, p_access_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v jsonb;
begin
 perform public.museum_check_student_v1(p_class_no,p_student_no,p_access_code);
 select to_jsonb(l) into v from public.museum_learning_v1 l where class_no=p_class_no and student_no=p_student_no;
 return coalesce(v,jsonb_build_object('payload',null,'version',0));
end; $function$
;
CREATE OR REPLACE FUNCTION public.museum_check_student_v1(p_class_no integer, p_student_no integer, p_access_code text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s text;
begin
 if p_access_code is null or length(p_access_code)>100 or not exists(select 1 from public.exhibition_settings_v1 where class_no=p_class_no and p_student_no between 1 and last_student_no) then raise exception 'Student access required' using errcode='42501'; end if;
 s := public.get_artwork_submission_state(p_class_no,p_student_no,p_access_code);
 if s is null or s not in ('new','revision','pending','approved','hidden') then raise exception 'Student access required' using errcode='42501'; end if;
 return s;
end; $function$
;
CREATE OR REPLACE FUNCTION public.submit_artwork(p_class_no integer, p_student_no integer, p_access_code text, p_display_name text, p_title text, p_original_title text, p_original_url text, p_parody_url text, p_ai_url text, p_feature text, p_intent text, p_prompt_text text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_artwork_id uuid;
  v_status text;
begin

  -- 학급 확인
  if p_class_no < 1 or p_class_no > 10 then
    raise exception '학급 번호가 올바르지 않습니다.';
  end if;

  -- 학생 번호 확인
  if p_student_no < 1 or p_student_no > 50 then
    raise exception '학생 번호가 올바르지 않습니다.';
  end if;

  -- 학생 접속코드 확인
  if not public.verify_student_access(
    p_class_no,
    p_student_no,
    p_access_code
  ) then
    raise exception '학생 접속코드가 올바르지 않습니다.';
  end if;

  -- 기본 입력 확인
  if coalesce(trim(p_display_name), '') = '' then
    raise exception '공개용 이름이 없습니다.';
  end if;

  if coalesce(trim(p_title), '') = '' then
    raise exception '작품 제목이 없습니다.';
  end if;

  if coalesce(trim(p_original_url), '') = '' then
    raise exception '원작 이미지가 없습니다.';
  end if;

  if coalesce(trim(p_parody_url), '') = '' then
    raise exception '패러디 작품 이미지가 없습니다.';
  end if;

  if coalesce(trim(p_ai_url), '') = '' then
    raise exception 'AI 재해석 이미지가 없습니다.';
  end if;


  -- 기존 작품 확인
  select
    id,
    status
  into
    v_artwork_id,
    v_status
  from public.artworks
  where
    class_no = p_class_no
    and student_no = p_student_no
  limit 1
  for update;


  -- =========================================
  -- 처음 제출하는 학생
  -- =========================================
  if v_artwork_id is null then

    insert into public.artworks (
      class_no,
      student_no,
      display_name,
      title,
      original_title,
      original_url,
      parody_url,
      ai_url,
      feature,
      intent,
      prompt_text,
      status
    )
    values (
      p_class_no,
      p_student_no,
      trim(p_display_name),
      trim(p_title),
      trim(coalesce(p_original_title, '')),
      p_original_url,
      p_parody_url,
      p_ai_url,
      p_feature,
      p_intent,
      p_prompt_text,
      'pending'
    )
    returning id into v_artwork_id;

    return v_artwork_id;

  end if;


  -- =========================================
  -- 선생님이 '수정 필요'로 돌려보낸 작품
  -- 기존 행을 수정하고 다시 pending으로 제출
  -- =========================================
  if v_status = 'revision' then

    update public.artworks
    set
      display_name = trim(p_display_name),
      title = trim(p_title),
      original_title = trim(coalesce(p_original_title, '')),
      original_url = p_original_url,
      parody_url = p_parody_url,
      ai_url = p_ai_url,
      feature = p_feature,
      intent = p_intent,
      prompt_text = p_prompt_text,
      status = 'pending'
    where id = v_artwork_id;

    return v_artwork_id;

  end if;


  -- =========================================
  -- 그 외 상태에서는 중복 제출 차단
  -- =========================================
  if v_status = 'pending' then
    raise exception '이미 선생님의 승인을 기다리고 있는 작품입니다.';
  end if;

  if v_status = 'approved' then
    raise exception '이미 승인되어 전시 중인 작품입니다.';
  end if;

  if v_status = 'hidden' then
    raise exception '현재 제출할 수 없는 작품입니다. 선생님께 문의해 주세요.';
  end if;

  raise exception '현재 작품 상태에서는 제출할 수 없습니다.';

end;
$function$
;
CREATE OR REPLACE FUNCTION public.submit_artwork_reflection_v1(p_class_no integer, p_student_no integer, p_access_code text, p_display_name text, p_title text, p_original_title text, p_original_url text, p_parody_url text, p_ai_url text, p_feature text, p_intent text, p_prompt_text text, p_ai_reflection text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_artwork_id uuid;
BEGIN
  IF p_class_no IS NULL OR p_student_no IS NULL OR
     public.verify_student_access(p_class_no, p_student_no, p_access_code) IS NOT TRUE THEN
    RAISE EXCEPTION '학생 접속코드 또는 학생 정보가 올바르지 않습니다.';
  END IF;
  IF char_length(coalesce(p_ai_reflection, '')) > 500 THEN
    RAISE EXCEPTION 'AI 변환 후 느낀 점은 500자 이내로 작성해 주세요.';
  END IF;
  v_artwork_id := public.submit_artwork(
    p_class_no, p_student_no, p_access_code, p_display_name, p_title,
    p_original_title, p_original_url, p_parody_url, p_ai_url,
    p_feature, p_intent, p_prompt_text
  );
  UPDATE public.artworks
  SET ai_reflection = trim(coalesce(p_ai_reflection, ''))
  WHERE id = v_artwork_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION '작품 저장을 확인하지 못했습니다. 다시 확인해 주세요.';
  END IF;
  RETURN v_artwork_id;
END;
$function$
;
create trigger check_exhibition_student_v1 before insert or update of class_no,student_no on public.artworks
 for each row execute function public.check_exhibition_student_v1();
revoke all on function public.check_exhibition_student_v1() from public,anon,authenticated;
revoke all on function public.museum_check_student_v1(integer,integer,text) from public,anon,authenticated;
revoke all on function public.get_my_learning_v1(integer,integer,text) from public;
grant execute on function public.get_my_learning_v1(integer,integer,text) to anon,authenticated;
revoke all on function public.submit_artwork(integer,integer,text,text,text,text,text,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.submit_artwork_reflection_v1(integer,integer,text,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.submit_artwork_reflection_v1(integer,integer,text,text,text,text,text,text,text,text,text,text,text) to anon,authenticated;
