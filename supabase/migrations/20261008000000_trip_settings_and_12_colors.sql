-- 설정 화면 한 번에 저장 + 멤버 색 12색 (2026-10-07 사용자 결정)
--   1) 멤버 아바타 색 번호 0~5 → 0~11 (화면 src/components/trip/parts.tsx MEMBER_COLORS 와 1:1)
--   2) save_trip_settings: 여행 정보·멤버 빼기·색·추가를 한 트랜잭션으로. 하나라도 실패하면 아무것도 반영되지 않는다

-- ---------------------------------------------------------------- 색 12개
alter table public.members drop constraint members_color_check;
alter table public.members add constraint members_color_check check (color between 0 and 11);

-- add_member: 안 쓰인 가장 작은 색 번호, 12색을 다 쓰면 인원 순서대로 돌려 쓴다 (나머지는 20261007 과 같다)
create or replace function public.add_member(p_trip_id uuid, p_name text, p_max integer) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
  v_sort integer;
  v_color smallint;
  v_id uuid;
begin
  perform 1 from public.trips where id = p_trip_id for update;
  if not found then
    raise exception 'trip not found' using errcode = 'P0002';
  end if;

  select count(*), coalesce(max(sort_order) + 1, 0) into v_count, v_sort
  from public.members where trip_id = p_trip_id;
  if v_count >= p_max then
    raise exception 'too many members' using errcode = 'NB001';
  end if;

  select coalesce(min(c), v_count % 12) into v_color
  from generate_series(0, 11) as c
  where c not in (select color from public.members where trip_id = p_trip_id);

  insert into public.members (trip_id, name, color, sort_order)
  values (p_trip_id, p_name, v_color, v_sort)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------- 설정 저장
-- p_trip   : {"name", "start", "end", "address"} — SQL NULL 이나 jsonb null 이면 여행 정보는 그대로
-- p_remove : 뺄 멤버 id. 지출에 든 멤버면 커밋 때 FK(deferred) 위반 23503 → 전부 취소
-- p_colors : [{"id", "color"}] 색만 바꿀 멤버
-- p_add    : [{"name", "color"}] 새 멤버. 순서(sort_order)는 지금 마지막 다음부터 이어서
-- 다른 여행 멤버 id 는 trip_id 조건으로 무시한다. 순서: 여행 정보 → 빼기 → 색 → 추가 → 인원 확인
create function public.save_trip_settings(
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
      address = p_trip->>'address'
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

-- ---------------------------------------------------------------- 권한 (서버 secret key 만)
revoke execute on function public.save_trip_settings(uuid, jsonb, uuid[], jsonb, jsonb, integer) from public, anon, authenticated;
grant execute on function public.save_trip_settings(uuid, jsonb, uuid[], jsonb, jsonb, integer) to service_role;
