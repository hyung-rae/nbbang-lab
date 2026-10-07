-- 여행 가계부 초기 스키마
--
-- 접근 모델 (2026-10-06, 인증 도입 전):
--   브라우저는 테이블에 직접 접근하지 않는다. 모든 읽기/쓰기는 Next.js 서버(Server Action)가 secret key 로 한다.
--   그래서 RLS 를 켜고 anon/authenticated 정책을 두지 않으며, 테이블·함수 권한도 회수한다.
--   여행 접근 통제 = 추측 불가한 slug 를 아는가. 인증을 붙일 때 정책·서버 검사를 추가한다.

-- ---------------------------------------------------------------- 여행
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[A-Za-z0-9]{12,32}$'),
  name text not null check (char_length(name) between 1 and 60),
  start_date date,
  end_date date,
  address text check (char_length(address) <= 200),
  -- 숙소 주소 지오코딩 결과 (카카오 로컬). 주소가 바뀌면 다시 채운다
  lat double precision,
  lng double precision,
  -- 덤탱이 쓸 사람. null 이면 가장 많이 받을 사람 (아래에서 같은 여행 멤버로 FK)
  taker_member_id uuid,
  -- 여행일 예보 캐시 { addr, at, src, days: [{ date, code, max, min, pop }] }
  forecast jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date is null or end_date is null or end_date >= start_date)
);

-- ---------------------------------------------------------------- 멤버
create table public.members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  -- 아바타 색 번호 (--m0 ~ --m5)
  color smallint not null check (color between 0 and 5),
  -- N빵 나머지 1원 배분 순서. 바꾸면 정산 결과가 바뀐다
  sort_order integer not null,
  created_at timestamptz not null default now(),
  unique (trip_id, name),
  unique (id, trip_id)
);
create index members_trip_idx on public.members (trip_id, sort_order);

alter table public.trips
  add constraint trips_taker_fk foreign key (taker_member_id, id)
  references public.members (id, trip_id) on delete set null (taker_member_id);

-- ---------------------------------------------------------------- 지출
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  date date not null,
  title text not null check (char_length(title) between 1 and 60),
  category text not null check (category in ('식비', '카페·간식', '숙소', '교통', '관광·체험', '쇼핑', '기타')),
  -- 원 단위 정수, 1억 원 이하
  amount integer not null check (amount between 1 and 100000000),
  -- 지출에 포함된 멤버는 뺄 수 없다. 커밋 시점 검사(deferred) — 즉시 검사하면 여행 삭제 cascade 가
  -- 지출보다 멤버를 먼저 지우는 순간 위반으로 실패한다
  payer_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, trip_id),
  foreign key (payer_id, trip_id) references public.members (id, trip_id)
    on delete no action deferrable initially deferred
);
create index expenses_trip_idx on public.expenses (trip_id, date);

create table public.expense_splits (
  expense_id uuid not null,
  member_id uuid not null,
  trip_id uuid not null,
  primary key (expense_id, member_id),
  foreign key (expense_id, trip_id) references public.expenses (id, trip_id) on delete cascade,
  foreign key (member_id, trip_id) references public.members (id, trip_id)
    on delete no action deferrable initially deferred -- 이유는 expenses.payer_id 참고
);
create index expense_splits_member_idx on public.expense_splits (member_id);

-- ---------------------------------------------------------------- 장보기
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  grp text not null default '기타' check (grp in ('고기', '채소·쌈', '식사·아침', '술·음료', '간식·안주', '바비큐·생활용품', '기타')),
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index shopping_items_trip_idx on public.shopping_items (trip_id, created_at);

-- ---------------------------------------------------------------- 음악 검색 캐시 (YouTube Data API)
create table public.music_cache (
  -- 정규화한 조건 조합 (예: "y:10,20|m:H|g:d")
  key text primary key,
  -- [{ id, title, channel, thumb }]
  videos jsonb not null,
  fetched_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- 마지막 저장 시각
-- 여행에 딸린 데이터가 바뀌면 trips.updated_at 을 갱신한다 (화면의 "마지막 저장 …")
create function public.touch_trip() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'trips' then
    new.updated_at := now();
    return new;
  end if;
  update public.trips set updated_at = now()
  where id = coalesce(new.trip_id, old.trip_id);
  return coalesce(new, old);
end;
$$;

-- 예보·좌표 캐시만 바뀐 것은 사용자 저장이 아니므로 제외
create trigger trips_touch before update on public.trips
  for each row
  when ((old.name, old.start_date, old.end_date, old.address, old.taker_member_id)
        is distinct from (new.name, new.start_date, new.end_date, new.address, new.taker_member_id))
  execute function public.touch_trip();
create trigger members_touch after insert or update or delete on public.members
  for each row execute function public.touch_trip();
create trigger expenses_touch after insert or update or delete on public.expenses
  for each row execute function public.touch_trip();
create trigger shopping_items_touch after insert or update or delete on public.shopping_items
  for each row execute function public.touch_trip();

-- ---------------------------------------------------------------- 지출 저장 (지출 + 나눌 사람을 한 트랜잭션으로)
create function public.save_expense(
  p_trip_id uuid,
  p_expense_id uuid,
  p_date date,
  p_title text,
  p_category text,
  p_amount integer,
  p_payer_id uuid,
  p_split uuid[]
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce(array_length(p_split, 1), 0) = 0 then
    raise exception 'split must not be empty' using errcode = '22023';
  end if;

  if p_expense_id is null then
    insert into public.expenses (trip_id, date, title, category, amount, payer_id)
    values (p_trip_id, p_date, p_title, p_category, p_amount, p_payer_id)
    returning id into v_id;
  else
    update public.expenses
    set date = p_date, title = p_title, category = p_category, amount = p_amount,
        payer_id = p_payer_id, updated_at = now()
    where id = p_expense_id and trip_id = p_trip_id
    returning id into v_id;
    if v_id is null then
      raise exception 'expense not found' using errcode = 'P0002';
    end if;
    delete from public.expense_splits where expense_id = v_id;
  end if;

  insert into public.expense_splits (expense_id, member_id, trip_id)
  select v_id, m, p_trip_id from unnest(p_split) as m
  on conflict do nothing;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------- 권한
alter table public.trips enable row level security;
alter table public.members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.shopping_items enable row level security;
alter table public.music_cache enable row level security;

revoke all on public.trips, public.members, public.expenses, public.expense_splits,
  public.shopping_items, public.music_cache from anon, authenticated;
revoke execute on function public.save_expense(uuid, uuid, date, text, text, integer, uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.touch_trip() from public, anon, authenticated;
grant execute on function public.save_expense(uuid, uuid, date, text, text, integer, uuid, uuid[]) to service_role;
