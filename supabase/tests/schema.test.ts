// 마이그레이션을 PGlite(WASM Postgres)에 적용해 제약·트리거·함수를 확인한다.
// Supabase 전용 역할(anon·authenticated·service_role)은 여기서 만들어 준다.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";

const MIGRATIONS = join(__dirname, "..", "migrations");

async function freshDb() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;`);
  for (const f of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, f), "utf8"));
  }
  return db;
}

type Db = Awaited<ReturnType<typeof freshDb>>;

async function one<T>(db: Db, sql: string, params: unknown[] = []): Promise<T> {
  const r = await db.query<T>(sql, params);
  return r.rows[0];
}

async function seed(db: Db) {
  const trip = await one<{ id: string }>(db, `insert into trips (slug, name) values ('abcdefghijkl', '가평') returning id`);
  const ids: string[] = [];
  for (const [i, name] of ["기준", "욱진", "연제"].entries()) {
    const m = await one<{ id: string }>(
      db,
      `insert into members (trip_id, name, color, sort_order) values ($1, $2, $3, $4) returning id`,
      [trip.id, name, i, i],
    );
    ids.push(m.id);
  }
  return { tripId: trip.id, members: ids };
}

const saveExpense = (db: Db, tripId: string, expenseId: string | null, payer: string, split: string[], amount = 30_000) =>
  one<{ id: string }>(
    db,
    `select save_expense($1, $2, '2026-10-10', '숙소', '숙소', $3, $4, $5::uuid[]) as id`,
    [tripId, expenseId, amount, payer, split],
  );

describe("init 마이그레이션", () => {
  let db: Db;
  beforeEach(async () => {
    db = await freshDb();
  });

  it("save_expense — 새 지출과 나눌 사람을 함께 저장, 수정 시 나눌 사람 교체", async () => {
    const { tripId, members } = await seed(db);
    const { id } = await saveExpense(db, tripId, null, members[1], members);
    expect((await db.query(`select * from expense_splits where expense_id = $1`, [id])).rows).toHaveLength(3);

    await saveExpense(db, tripId, id, members[0], [members[0]], 12_345);
    const e = await one<{ amount: number; payer_id: string }>(db, `select amount, payer_id from expenses where id = $1`, [id]);
    expect(e).toEqual({ amount: 12_345, payer_id: members[0] });
    expect((await db.query(`select member_id from expense_splits where expense_id = $1`, [id])).rows).toEqual([
      { member_id: members[0] },
    ]);
  });

  it("save_expense — 나눌 사람이 없거나 다른 여행 멤버면 거부", async () => {
    const a = await seed(db);
    const other = await one<{ id: string }>(db, `insert into trips (slug, name) values ('zzzzzzzzzzzz', '다른 여행') returning id`);
    const stranger = await one<{ id: string }>(
      db,
      `insert into members (trip_id, name, color, sort_order) values ($1, '남', 0, 0) returning id`,
      [other.id],
    );
    await expect(saveExpense(db, a.tripId, null, a.members[0], [])).rejects.toThrow(/split must not be empty/);
    await expect(saveExpense(db, a.tripId, null, stranger.id, a.members)).rejects.toThrow(/foreign key/);
    await expect(saveExpense(db, a.tripId, null, a.members[0], [stranger.id])).rejects.toThrow(/foreign key/);
    // 실패한 호출은 지출을 남기지 않는다 (한 트랜잭션)
    expect((await one<{ n: number }>(db, `select count(*)::int as n from expenses`)).n).toBe(0);
  });

  it("금액 범위·분류 제약", async () => {
    const { tripId, members } = await seed(db);
    await expect(saveExpense(db, tripId, null, members[0], members, 0)).rejects.toThrow(/check/);
    await expect(saveExpense(db, tripId, null, members[0], members, 100_000_001)).rejects.toThrow(/check/);
    await expect(
      db.query(`select save_expense($1, null, '2026-10-10', 'x', '술값', 1000, $2, $3::uuid[])`, [tripId, members[0], members]),
    ).rejects.toThrow(/check/);
  });

  it("지출에 포함된 멤버는 뺄 수 없고, 아니면 뺄 수 있다", async () => {
    const { tripId, members } = await seed(db);
    await saveExpense(db, tripId, null, members[0], [members[0], members[1]]);
    await expect(db.query(`delete from members where id = $1`, [members[1]])).rejects.toThrow(/foreign key/);
    await expect(db.query(`delete from members where id = $1`, [members[0]])).rejects.toThrow(/foreign key/);
    await db.query(`delete from members where id = $1`, [members[2]]);
  });

  it("여행을 지우면 딸린 데이터가 모두 지워진다", async () => {
    const { tripId, members } = await seed(db);
    await saveExpense(db, tripId, null, members[0], members);
    await db.query(`insert into shopping_items (trip_id, name, grp) values ($1, '삼겹살', '고기')`, [tripId]);
    await db.query(`update trips set taker_member_id = $1 where id = $2`, [members[1], tripId]);
    await db.query(`delete from trips where id = $1`, [tripId]);
    for (const t of ["members", "expenses", "expense_splits", "shopping_items"]) {
      expect((await one<{ n: number }>(db, `select count(*)::int as n from ${t}`)).n, t).toBe(0);
    }
  });

  it("덤탱이는 같은 여행 멤버만, 그 멤버를 빼면 null", async () => {
    const a = await seed(db);
    const other = await seed(db).catch(() => null);
    expect(other).toBeNull(); // 같은 slug 는 unique 위반
    const b = await one<{ id: string }>(db, `insert into trips (slug, name) values ('bbbbbbbbbbbb', 'b') returning id`);
    await expect(db.query(`update trips set taker_member_id = $1 where id = $2`, [a.members[0], b.id])).rejects.toThrow(
      /foreign key/,
    );
    await db.query(`update trips set taker_member_id = $1 where id = $2`, [a.members[2], a.tripId]);
    await db.query(`delete from members where id = $1`, [a.members[2]]);
    expect((await one<{ t: string | null }>(db, `select taker_member_id as t from trips where id = $1`, [a.tripId])).t).toBeNull();
  });

  it("updated_at — 사용자 변경엔 갱신, 예보 캐시만 바뀌면 그대로", async () => {
    const { tripId } = await seed(db);
    const at = async () => (await one<{ u: Date }>(db, `select updated_at as u from trips where id = $1`, [tripId])).u.getTime();
    await db.query(`update trips set updated_at = '2000-01-01' where id = $1`, [tripId]);
    const base = await at();

    await db.query(`update trips set forecast = '{"days":[]}', lat = 37.6, lng = 127.5 where id = $1`, [tripId]);
    expect(await at()).toBe(base);

    await db.query(`insert into shopping_items (trip_id, name) values ($1, '물티슈')`, [tripId]);
    expect(await at()).toBeGreaterThan(base);

    await db.query(`update trips set updated_at = '2000-01-01' where id = $1`, [tripId]);
    await db.query(`update trips set name = '가평 2' where id = $1`, [tripId]);
    expect(await at()).toBeGreaterThan(base);
  });

  it("anon·authenticated 는 테이블과 함수를 쓸 수 없다", async () => {
    const { tripId, members } = await seed(db);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await expect(db.query(`select * from trips`)).rejects.toThrow(/permission denied/);
      await expect(saveExpense(db, tripId, null, members[0], members)).rejects.toThrow(/permission denied/);
      await db.exec(`reset role`);
    }
  });

  it("slug 형식", async () => {
    await expect(db.query(`insert into trips (slug, name) values ('short', 'x')`)).rejects.toThrow(/check/);
    await expect(db.query(`insert into trips (slug, name) values ('has-dash-0000', 'x')`)).rejects.toThrow(/check/);
  });
});

describe("20261007 원자적 추가 · 여행 요약", () => {
  let db: Db;
  beforeEach(async () => {
    db = await freshDb();
  });

  const addMember = (tripId: string, name: string, max = 12) =>
    one<{ id: string }>(db, `select add_member($1, $2, $3) as id`, [tripId, name, max]);

  it("add_member — 순서는 이어서, 색은 안 쓰인 가장 작은 번호", async () => {
    const { tripId, members } = await seed(db); // 색 0·1·2, 순서 0·1·2
    await db.query(`delete from members where id = $1`, [members[1]]); // 색 1 비움
    await addMember(tripId, "형래");
    const r = await one<{ color: number; sort_order: number }>(
      db,
      `select color, sort_order from members where trip_id = $1 and name = '형래'`,
      [tripId],
    );
    expect(r).toEqual({ color: 1, sort_order: 3 });
  });

  it("add_member — 인원 제한·같은 이름·없는 여행", async () => {
    const { tripId } = await seed(db);
    await expect(addMember(tripId, "넷째", 3)).rejects.toMatchObject({ code: "NB001" });
    await expect(addMember(tripId, "기준")).rejects.toMatchObject({ code: "23505" });
    await expect(addMember("00000000-0000-4000-8000-000000000000", "x")).rejects.toMatchObject({ code: "P0002" });
  });

  it("add_member — 12색을 다 쓰면 인원 순서대로 돌려 쓴다 (20261008 에서 6색 → 12색)", async () => {
    const { tripId } = await seed(db);
    for (const n of ["d", "e", "f", "g", "h", "i", "j", "k", "l", "m"]) await addMember(tripId, n, 20);
    const rows = (await db.query<{ color: number }>(`select color from members where trip_id = $1 order by sort_order`, [tripId])).rows;
    expect(rows.map((r) => r.color)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0]);
  });

  it("sort_order 는 여행 안에서 겹칠 수 없다", async () => {
    const { tripId } = await seed(db);
    await expect(
      db.query(`insert into members (trip_id, name, color, sort_order) values ($1, '중복', 0, 0)`, [tripId]),
    ).rejects.toThrow(/members_trip_sort_unique/);
  });

  it("add_shopping_item — 개수 제한", async () => {
    const { tripId } = await seed(db);
    await one(db, `select add_shopping_item($1, '삼겹살', '고기', 2) as id`, [tripId]);
    await one(db, `select add_shopping_item($1, '맥주', '술·음료', 2) as id`, [tripId]);
    await expect(one(db, `select add_shopping_item($1, '얼음', '술·음료', 2) as id`, [tripId])).rejects.toMatchObject({
      code: "NB002",
    });
  });

  it("trip_summaries — 인원·지출 건수·합계를 여행당 한 행으로", async () => {
    const { tripId, members } = await seed(db);
    await saveExpense(db, tripId, null, members[0], members, 30_000);
    await saveExpense(db, tripId, null, members[1], [members[1]], 1_234);
    await db.query(`insert into trips (slug, name) values ('emptytrip000', '빈 여행')`);
    const rows = (
      await db.query<{ slug: string; member_count: number; expense_count: number; total: string | number }>(
        `select slug, member_count, expense_count, total from trip_summaries order by slug`,
      )
    ).rows;
    expect(rows.map((r) => ({ ...r, total: Number(r.total) }))).toEqual([
      { slug: "abcdefghijkl", member_count: 3, expense_count: 2, total: 31_234 },
      { slug: "emptytrip000", member_count: 0, expense_count: 0, total: 0 },
    ]);
  });

  it("anon·authenticated 는 새 함수·뷰를 쓸 수 없다", async () => {
    const { tripId } = await seed(db);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await expect(db.query(`select * from trip_summaries`)).rejects.toThrow(/permission denied/);
      await expect(addMember(tripId, "몰래")).rejects.toThrow(/permission denied/);
      await expect(db.query(`select add_shopping_item($1, 'x', '기타', 80)`, [tripId])).rejects.toThrow(/permission denied/);
      await db.exec(`reset role`);
    }
  });
});

describe("20261008 설정 한 번에 저장 · 12색", () => {
  let db: Db;
  beforeEach(async () => {
    db = await freshDb();
  });

  const save = (
    tripId: string,
    o: { trip?: object | null; remove?: string[]; colors?: object[]; add?: object[]; max?: number } = {},
  ) =>
    db.query(`select save_trip_settings($1, $2::jsonb, $3::uuid[], $4::jsonb, $5::jsonb, $6)`, [
      tripId,
      o.trip === undefined ? null : JSON.stringify(o.trip),
      o.remove ?? [],
      JSON.stringify(o.colors ?? []),
      JSON.stringify(o.add ?? []),
      o.max ?? 12,
    ]);
  const members = async (tripId: string) =>
    (
      await db.query<{ name: string; color: number; sort_order: number }>(
        `select name, color, sort_order from members where trip_id = $1 order by sort_order`,
        [tripId],
      )
    ).rows;

  it("색 번호는 0~11", async () => {
    const { tripId } = await seed(db);
    await db.query(`insert into members (trip_id, name, color, sort_order) values ($1, '열하나', 11, 10)`, [tripId]);
    await expect(
      db.query(`insert into members (trip_id, name, color, sort_order) values ($1, '열둘', 12, 11)`, [tripId]),
    ).rejects.toThrow(/members_color_check/);
  });

  it("여행 정보·빼기·색·추가를 한 번에, 새 멤버 순서는 이어서", async () => {
    const { tripId, members: [, 욱진, 연제] } = await seed(db);
    await save(tripId, {
      trip: { name: "양평", start: "2026-11-01", end: "2026-11-02", address: "경기 양평군" },
      remove: [욱진],
      colors: [{ id: 연제, color: 9 }],
      add: [
        { name: "형래", color: 11 },
        { name: "민지", color: 7 },
      ],
    });
    const t = await one<{ name: string; start_date: unknown; address: string }>(
      db,
      `select name, start_date::text as start_date, address from trips where id = $1`,
      [tripId],
    );
    expect(t).toEqual({ name: "양평", start_date: "2026-11-01", address: "경기 양평군" });
    expect(await members(tripId)).toEqual([
      { name: "기준", color: 0, sort_order: 0 },
      { name: "연제", color: 9, sort_order: 2 },
      { name: "형래", color: 11, sort_order: 3 },
      { name: "민지", color: 7, sort_order: 4 },
    ]);
  });

  it("p_trip 이 null 이면 여행 정보는 그대로", async () => {
    const { tripId } = await seed(db);
    await save(tripId, { trip: null, add: [{ name: "형래", color: 3 }] });
    expect((await one<{ name: string }>(db, `select name from trips where id = $1`, [tripId])).name).toBe("가평");
  });

  it("하나라도 실패하면 아무것도 반영되지 않는다 — 지출에 든 사람 빼기·같은 이름·인원 초과", async () => {
    const { tripId, members: ids } = await seed(db);
    await saveExpense(db, tripId, null, ids[0], [ids[0], ids[1]]);
    const before = await members(tripId);
    const change = { trip: { name: "바뀜", start: null, end: null, address: null }, colors: [{ id: ids[2], color: 8 }] };

    await expect(save(tripId, { ...change, remove: [ids[1]] })).rejects.toMatchObject({ code: "23503" });
    await expect(save(tripId, { ...change, add: [{ name: "기준", color: 4 }] })).rejects.toMatchObject({ code: "23505" });
    await expect(save(tripId, { ...change, add: [{ name: "넷째", color: 4 }], max: 3 })).rejects.toMatchObject({
      code: "NB001",
    });

    expect((await one<{ name: string }>(db, `select name from trips where id = $1`, [tripId])).name).toBe("가평");
    expect(await members(tripId)).toEqual(before);
  });

  it("빼고 같은 이름으로 다시 넣을 수 있고, 다른 여행 멤버 id 는 무시한다", async () => {
    const { tripId, members: ids } = await seed(db);
    const other = await one<{ id: string }>(db, `insert into trips (slug, name) values ('othertrip000', '남의 여행') returning id`);
    const stranger = await one<{ id: string }>(
      db,
      `insert into members (trip_id, name, color, sort_order) values ($1, '남', 0, 0) returning id`,
      [other.id],
    );
    await save(tripId, {
      remove: [ids[2], stranger.id],
      colors: [{ id: stranger.id, color: 5 }],
      add: [{ name: "연제", color: 10 }],
    });
    expect((await members(tripId)).map((m) => m.name)).toEqual(["기준", "욱진", "연제"]);
    expect(await one(db, `select color from members where id = $1`, [stranger.id])).toEqual({ color: 0 });
  });

  it("없는 여행은 P0002, anon·authenticated 는 쓸 수 없다", async () => {
    const { tripId } = await seed(db);
    await expect(save("00000000-0000-4000-8000-000000000000")).rejects.toMatchObject({ code: "P0002" });
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await expect(save(tripId)).rejects.toThrow(/permission denied/);
      await db.exec(`reset role`);
    }
  });
});

describe("20261009 여행 입장 비밀번호", () => {
  let db: Db;
  beforeEach(async () => {
    db = await freshDb();
  });

  const saveTrip = (tripId: string, trip: object) =>
    db.query(`select save_trip_settings($1, $2::jsonb, '{}'::uuid[], '[]'::jsonb, '[]'::jsonb, 12)`, [
      tripId,
      JSON.stringify(trip),
    ]);
  const password = async (tripId: string) =>
    (await one<{ entry_password: string | null }>(db, `select entry_password from trips where id = $1`, [tripId]))
      .entry_password;
  const info = { name: "가평", start: null, end: null, address: null };

  it("기존 여행은 비밀번호 없음(null), 길이는 4~20자", async () => {
    const { tripId } = await seed(db);
    expect(await password(tripId)).toBeNull();
    await db.query(`update trips set entry_password = 'abcd' where id = $1`, [tripId]);
    await db.query(`update trips set entry_password = $2 where id = $1`, [tripId, "가".repeat(20)]);
    await expect(db.query(`update trips set entry_password = 'abc' where id = $1`, [tripId])).rejects.toThrow(
      /entry_password/,
    );
    await expect(db.query(`update trips set entry_password = $2 where id = $1`, [tripId, "a".repeat(21)])).rejects.toThrow(
      /entry_password/,
    );
  });

  it("save_trip_settings — password 키가 있으면 저장, 빈 문자열이면 열림(null), 키가 없으면 그대로", async () => {
    const { tripId } = await seed(db);
    await saveTrip(tripId, { ...info, password: "pass1234" });
    expect(await password(tripId)).toBe("pass1234");
    await saveTrip(tripId, { ...info, name: "양평" });
    expect(await password(tripId)).toBe("pass1234");
    await saveTrip(tripId, { ...info, password: "" });
    expect(await password(tripId)).toBeNull();
    await expect(saveTrip(tripId, { ...info, password: "abc" })).rejects.toThrow(/entry_password/);
  });

  it("trip_summaries — has_password 만 보이고 비밀번호 값은 없다", async () => {
    const { tripId } = await seed(db);
    await db.query(`insert into trips (slug, name) values ('emptytrip000', '빈 여행')`);
    await db.query(`update trips set entry_password = 'pass1234' where id = $1`, [tripId]);
    const rows = (await db.query<Record<string, unknown>>(`select * from trip_summaries order by slug`)).rows;
    expect(rows.map((r) => [r.slug, r.has_password])).toEqual([
      ["abcdefghijkl", true],
      ["emptytrip000", false],
    ]);
    expect(Object.keys(rows[0])).not.toContain("entry_password");
  });

  it("anon·authenticated 는 비밀번호를 읽을 수 없다", async () => {
    const { tripId } = await seed(db);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await expect(db.query(`select entry_password from trips`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`select * from trip_summaries`)).rejects.toThrow(/permission denied/);
      await expect(saveTrip(tripId, { ...info, password: "" })).rejects.toThrow(/permission denied/);
      await db.exec(`reset role`);
    }
  });
});
