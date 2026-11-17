create function public.save_registration_draft_v1(
 p_class_no integer,p_student_no integer,p_access_code text,
 p_feature text,p_intent text,p_prompt_text text,p_ai_reflection text,p_version integer
) returns integer language plpgsql security definer set search_path='' as $$
declare v_state text; v_version integer;
begin
 v_state:=public.museum_check_student_v1(p_class_no,p_student_no,p_access_code);
 if v_state not in ('new','revision') then
  raise exception '이미 제출한 작품은 임시 저장할 수 없습니다.' using errcode='42501';
 end if;
 if p_version is null or p_version<0 then raise exception '기록을 다시 확인해 주세요.' using errcode='22023'; end if;
 if p_feature is null or p_intent is null or p_prompt_text is null or p_ai_reflection is null
 or char_length(p_feature)>300 or char_length(p_intent)>300
 or char_length(p_prompt_text)>500 or char_length(p_ai_reflection)>500 then
  raise exception '작성 내용의 길이를 확인해 주세요.' using errcode='22023';
 end if;
 insert into public.museum_learning_v1(class_no,student_no)
 values(p_class_no,p_student_no) on conflict(class_no,student_no) do nothing;
 update public.museum_learning_v1
 set payload=jsonb_set(payload,'{registration_draft_v1}',
  jsonb_build_object('feature',p_feature,'intent',p_intent,'prompt_text',p_prompt_text,'ai_reflection',p_ai_reflection),true),
 version=version+1
 where class_no=p_class_no and student_no=p_student_no
 and version=p_version and jsonb_typeof(payload)='object'
 returning version into v_version;
 if not found then raise exception '다른 곳에서 저장된 기록이 있습니다. 다시 확인해 주세요.' using errcode='40001'; end if;
 -- Recheck after a possible row wait. Any rejection rolls back this whole call.
 v_state:=public.museum_check_student_v1(p_class_no,p_student_no,p_access_code);
 if v_state not in ('new','revision') then
  raise exception '이미 제출한 작품은 임시 저장할 수 없습니다.' using errcode='42501';
 end if;
 return v_version;
end;
$$;
revoke all on function public.save_registration_draft_v1(integer,integer,text,text,text,text,text,integer) from public;
grant execute on function public.save_registration_draft_v1(integer,integer,text,text,text,text,text,integer) to anon,authenticated;
