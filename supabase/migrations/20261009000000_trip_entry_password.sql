-- 여행 입장 비밀번호 (2026-10-07 사용자 결정)
--   1) trips.entry_password: 관리자가 정한 입장 비밀번호. null 이면 열린 여행(비밀번호 없이 입장)
--      관리자가 설정 탭에서 다시 볼 수 있게 평문으로 둔다(사용자 결정) — 테이블은 서버 secret key 만 읽는다
--   2) save_trip_settings: p_trip 에 "password" 키가 있으면 함께 저장(빈 문자열 → null = 열림), 없으면 그대로
--   3) trip_summaries: 목록이 창을 띄울지 알도록 has_password 만 더한다 — 비밀번호 값은 뷰에 넣지 않는다

-- ---------------------------------------------------------------- 칼럼
alter table public.trips add column entry_password text
  check (entry_password is null or char_length(entry_password) between 4 and 20);

-- ---------------------------------------------------------------- 설정 저장 (20261008 과 같고 비밀번호만 더함)
create or replace function public.save_trip_settings(
  p_trip_id uuid,
  p_trip jsonb,
  p_remove uuid[],
  p_colors jsonb,
  p_add jsonb,
  p_max integer
) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_sort integer;
begin
  perform 1 from public.trips where id = p_trip_id for update;
  if not found then
    raise exception 'trip not found' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_trip) = 'object' then
    update public.trips set
      name = p_trip->>'name',
      start_date = (p_trip->>'start')::date,
      end_date = (p_trip->>'end')::date,
      address = p_trip->>'address',
      -- 키가 없으면 그대로 둔다 — 빠뜨린 호출이 비밀번호를 지워 여행을 열어 버리지 않게
      entry_password = case when p_trip ? 'password' then nullif(p_trip->>'password', '') else entry_password end
    where id = p_trip_id;
  end if;

  delete from public.members
  where trip_id = p_trip_id and id = any (coalesce(p_remove, '{}'));

  update public.members m set color = (c->>'color')::smallint
  from jsonb_array_elements(coalesce(p_colors, '[]')) as c
  where m.trip_id = p_trip_id and m.id = (c->>'id')::uuid;

  select coalesce(max(sort_order) + 1, 0) into v_sort from public.members where trip_id = p_trip_id;
  insert into public.members (trip_id, name, color, sort_order)
  select p_trip_id, a.value->>'name', (a.value->>'color')::smallint, v_sort + a.ord - 1
  from jsonb_array_elements(coalesce(p_add, '[]')) with ordinality as a(value, ord);

  if (select count(*) from public.members where trip_id = p_trip_id) > p_max then
    raise exception 'too many members' using errcode = 'NB001';
  end if;
end;
$$;

-- ---------------------------------------------------------------- 여행 목록 (끝에 has_password 추가)
create or replace view public.trip_summaries with (security_invoker = true) as
select
  t.slug,
  t.name,
  t.start_date,
  t.end_date,
  t.updated_at,
  (select count(*) from public.members m where m.trip_id = t.id)::integer as member_count,
  (select count(*) from public.expenses e where e.trip_id = t.id)::integer as expense_count,
  coalesce((select sum(e.amount) from public.expenses e where e.trip_id = t.id), 0)::bigint as total,
  t.entry_password is not null as has_password
from public.trips t;

-- ---------------------------------------------------------------- 권한 (서버 secret key 만 — create or replace 는 기존 권한을 유지하지만 다시 못박는다)
revoke all on public.trip_summaries from anon, authenticated;
grant select on public.trip_summaries to service_role;
revoke execute on function public.save_trip_settings(uuid, jsonb, uuid[], jsonb, jsonb, integer) from public, anon, authenticated;
grant execute on function public.save_trip_settings(uuid, jsonb, uuid[], jsonb, jsonb, integer) to service_role;
