import { describe, expect, it } from "vitest";
import { toTripData, type TripQueryRow } from "./mapping";
import { isValidSlug, newSlug } from "./slug";

const base: TripQueryRow = {
  id: "t1",
  slug: "abcdefghijkl",
  name: "26년 가을",
  start_date: "2026-10-10",
  end_date: "2026-10-11",
  address: "경기 가평군 설악면 예시로 1",
  lat: null,
  lng: null,
  taker_member_id: "m2",
  forecast: null,
  created_at: "2026-10-06T00:00:00Z",
  updated_at: "2026-10-06T08:07:23Z",
  members: [
    { id: "m2", trip_id: "t1", name: "욱진", color: 1, sort_order: 1, created_at: "2026-10-06T00:00:02Z" },
    { id: "m1", trip_id: "t1", name: "기준", color: 0, sort_order: 0, created_at: "2026-10-06T00:00:01Z" },
  ],
  expenses: [
    {
      id: "e1",
      trip_id: "t1",
      date: "2026-10-10",
      title: "장보기",
      category: "식비",
      amount: 80_000,
      payer_id: "m1",
      created_at: "2026-10-06T01:00:00Z",
      updated_at: "2026-10-06T01:00:00Z",
      expense_splits: [{ member_id: "m1" }, { member_id: "m2" }],
    },
    {
      id: "e2",
      trip_id: "t1",
      date: "2026-10-11",
      title: "옛 분류",
      category: "술값",
      amount: 1,
      payer_id: "m2",
      created_at: "2026-10-06T00:30:00Z",
      updated_at: "2026-10-06T00:30:00Z",
      expense_splits: [{ member_id: "m2" }],
    },
  ],
  shopping_items: [
    { id: "s2", trip_id: "t1", name: "소시지", grp: "고기", done: false, created_at: "2026-10-06T02:00:00Z" },
    { id: "s1", trip_id: "t1", name: "얼음", grp: "모르는분류", done: true, created_at: "2026-10-06T01:00:00Z" },
  ],
};

describe("toTripData", () => {
  const d = toTripData(base);

  it("멤버는 sort_order 순 (N빵 나머지 배분 순서)", () => {
    expect(d.members.map((m) => m.name)).toEqual(["기준", "욱진"]);
  });

  it("지출은 최신 날짜 순, 모르는 분류는 기타", () => {
    expect(d.expenses.map((e) => e.id)).toEqual(["e2", "e1"]);
    expect(d.expenses[0].category).toBe("기타");
    expect(d.expenses[1]).toMatchObject({ payerId: "m1", split: ["m1", "m2"] });
  });

  it("장보기는 추가 순, 모르는 분류는 기타", () => {
    expect(d.shopping.map((s) => [s.name, s.group])).toEqual([
      ["얼음", "기타"],
      ["소시지", "고기"],
    ]);
  });

  it("여행 정보·덤탱이·예보", () => {
    expect(d.trip).toEqual({ name: "26년 가을", start: "2026-10-10", end: "2026-10-11", address: base.address });
    expect(d.takerId).toBe("m2");
    expect(d.forecast).toBeNull();
    expect(toTripData({ ...base, forecast: { addr: "a", at: "b", src: "Open-Meteo", days: [] } }).forecast).toEqual({
      addr: "a",
      at: "b",
      src: "Open-Meteo",
      days: [],
    });
    expect(toTripData({ ...base, forecast: { broken: true } }).forecast).toBeNull();
  });
});

describe("slug", () => {
  it("12자 영숫자, 매번 다르다", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const s = newSlug();
      expect(isValidSlug(s)).toBe(true);
      expect(s).toHaveLength(12);
      seen.add(s);
    }
    expect(seen.size).toBe(1000);
  });

  it("형식이 틀린 slug 는 거부", () => {
    expect(isValidSlug("short")).toBe(false);
    expect(isValidSlug("has-dash-0000")).toBe(false);
    expect(isValidSlug("../../etc/passwd")).toBe(false);
  });
});
