-- 코드 리뷰(2026-10-07) 결함 수정
--   1) 멤버·장보기 추가를 한 트랜잭션 안에서 원자적으로: 동시에 추가해도 인원·개수 제한이 지켜지고,
--      N빵 나머지 1원 배분 순서인 members.sort_order 가 겹치지 않는다
--   2) 여행 목록 요약 뷰: 목록 화면이 모든 지출 행을 내려받지 않고 여행당 한 행으로 받는다

-- ---------------------------------------------------------------- sort_order 유일
-- 기존 중복을 정리한다. 상대 순서(sort_order, created_at)는 그대로 두고 0부터 다시 매긴다 → 정산 결과 불변
with r as (
  select id, row_number() over (partition by trip_id order by sort_order, created_at) - 1 as rn
  from public.members
)
update public.members m set sort_order = r.rn
from r
where m.id = r.id and m.sort_order <> r.rn;

alter table public.members add constraint members_trip_sort_unique unique (trip_id, sort_order);

-- ---------------------------------------------------------------- 멤버 추가
-- 여행 행을 잠가(for update) 같은 여행의 추가를 줄 세운 뒤, 인원 확인 → 색·순서 계산 → 추가
create function public.add_member(p_trip_id uuid, p_name text, p_max integer) returns uuid
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

  -- 안 쓰인 가장 작은 색 번호, 6색을 다 쓰면 인원 순서대로 돌려 쓴다
  select coalesce(min(c), v_count % 6) into v_color
  from generate_series(0, 5) as c
  where c not in (select color from public.members where trip_id = p_trip_id);

  insert into public.members (trip_id, name, color, sort_order)
  values (p_trip_id, p_name, v_color, v_sort)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------- 장보기 추가
create function public.add_shopping_item(p_trip_id uuid, p_name text, p_grp text, p_max integer) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform 1 from public.trips where id = p_trip_id for update;
  if not found then
    raise exception 'trip not found' using errcode = 'P0002';
  end if;
  if (select count(*) from public.shopping_items where trip_id = p_trip_id) >= p_max then
    raise exception 'too many shopping items' using errcode = 'NB002';
  end if;
  insert into public.shopping_items (trip_id, name, grp)
  values (p_trip_id, p_name, p_grp)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------- 여행 목록 요약
-- security_invoker: 뷰를 읽는 쪽 권한으로 실행 (만든 사람 권한으로 RLS 를 건너뛰지 않게)
create view public.trip_summaries with (security_invoker = true) as
select
  t.slug,
  t.name,
  t.start_date,
  t.end_date,
  t.updated_at,
  (select count(*) from public.members m where m.trip_id = t.id)::integer as member_count,
  (select count(*) from public.expenses e where e.trip_id = t.id)::integer as expense_count,
  coalesce((select sum(e.amount) from public.expenses e where e.trip_id = t.id), 0)::bigint as total
from public.trips t;

-- ---------------------------------------------------------------- 권한 (init 마이그레이션과 같은 모델: 서버 secret key 만)
revoke all on public.trip_summaries from anon, authenticated;
revoke execute on function public.add_member(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.add_shopping_item(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.add_member(uuid, text, integer) to service_role;
grant execute on function public.add_shopping_item(uuid, text, text, integer) to service_role;
grant select on public.trip_summaries to service_role;
