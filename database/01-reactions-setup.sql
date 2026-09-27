-- Run once in Supabase SQL Editor with the project owner account.
-- No public table reads; only a write RPC is exposed. Counts stay in SQL Editor.
begin;
create table if not exists public.artwork_reactions_v1 (
  artwork_id text not null,
  visitor_id uuid not null,
  kind text not null check (kind in ('heart','color','idea')),
  created_at timestamptz not null default now(),
  primary key (artwork_id, visitor_id, kind)
);
alter table public.artwork_reactions_v1 enable row level security;
revoke all on public.artwork_reactions_v1 from public, anon, authenticated;

create or replace function public.set_artwork_reaction_v1(
  p_artwork_id text, p_visitor uuid, p_kind text, p_active boolean
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_visitor is null or p_active is null or p_kind is null or p_kind not in ('heart','color','idea') then
    raise exception 'Invalid reaction';
  end if;
  if not exists (select 1 from public.artworks a where a.id::text = p_artwork_id and a.status = 'approved') then
    raise exception 'Artwork unavailable';
  end if;
  if p_active then
    insert into public.artwork_reactions_v1 (artwork_id,visitor_id,kind)
    values (p_artwork_id,p_visitor,p_kind) on conflict do nothing;
  else
    delete from public.artwork_reactions_v1 where artwork_id=p_artwork_id and visitor_id=p_visitor and kind=p_kind;
  end if;
end;
$$;
revoke all on function public.set_artwork_reaction_v1(text,uuid,text,boolean) from public;
grant execute on function public.set_artwork_reaction_v1(text,uuid,text,boolean) to anon, authenticated;
commit;
