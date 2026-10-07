import { describe, expect, it } from "vitest";
import { CATEGORIES } from "./categories";
import { SETTLE_UNIT, settle, splitEven } from "./settle";
import type { Expense, Member } from "./types";

const m = (id: string, name = id): Member => ({ id, name, color: 0 });
const exp = (p: Partial<Expense> & Pick<Expense, "amount" | "payerId" | "split">): Expense => ({
  id: Math.random().toString(36).slice(2),
  date: "2026-10-10",
  title: "지출",
  category: "기타",
  ...p,
});

describe("splitEven", () => {
  it("나머지 원은 앞사람부터 1원씩", () => {
    expect(splitEven(10, 3)).toEqual([4, 3, 3]);
    expect(splitEven(346_630, 4)).toEqual([86_658, 86_658, 86_657, 86_657]);
  });

  it("합계가 원래 금액과 같다", () => {
    for (const [a, n] of [[1, 3], [99_999_999, 7], [100, 12]]) {
      expect(splitEven(a, n).reduce((s, v) => s + v, 0)).toBe(a);
    }
  });
});

describe("settle — 명세 예시", () => {
  // 아티팩트 실데이터와 같은 멤버 순서
  const members = [m("기준"), m("욱진"), m("연제"), m("형래")];
  const all = members.map((x) => x.id);
  const lodging = [exp({ amount: 346_630, payerId: "욱진", split: all, category: "숙소" })];

  it("욱진 346,630원 4명 N빵, 덤탱이 욱진 → 셋이 86,600원씩, 끝전 +172원", () => {
    const r = settle(members, lodging, "욱진");
    expect(r.taker).toBe("욱진");
    expect(r.takerCost).toBe(172);
    expect(r.transfers).toEqual([
      { from: "기준", to: "욱진", amount: 86_600 },
      { from: "연제", to: "욱진", amount: 86_600 },
      { from: "형래", to: "욱진", amount: 86_600 },
    ]);
  });

  it("같은 지출, 덤탱이 형래 → 형래 86,800원 · 기준·연제 86,600원", () => {
    const r = settle(members, lodging, "형래");
    expect(r.transfers).toEqual([
      { from: "형래", to: "욱진", amount: 86_800 },
      { from: "기준", to: "욱진", amount: 86_600 },
      { from: "연제", to: "욱진", amount: 86_600 },
    ]);
    expect(r.takerCost).toBe(143);
    expect(r.bal["욱진"]).toBe(260_000);
  });

  it("700,000원(연제 450,000·형래 250,000) → 최소 송금 3건", () => {
    // 명세 예시의 송금 순서는 욱진이 기준보다 앞일 때 나온다 (동률은 멤버 순서)
    const ms = [m("욱진"), m("기준"), m("연제"), m("형래")];
    const ids = ms.map((x) => x.id);
    const r = settle(ms, [
      exp({ amount: 450_000, payerId: "연제", split: ids }),
      exp({ amount: 250_000, payerId: "형래", split: ids }),
    ]);
    expect(r.transfers).toEqual([
      { from: "욱진", to: "연제", amount: 175_000 },
      { from: "기준", to: "연제", amount: 100_000 },
      { from: "기준", to: "형래", amount: 75_000 },
    ]);
    expect(r.takerCost).toBe(0);
  });
});

describe("settle — 경계", () => {
  const members = [m("a"), m("b"), m("c")];

  it("결제자가 없는 지출·나눌 사람이 0명인 지출은 제외", () => {
    const r = settle(members, [
      exp({ amount: 9_000, payerId: "탈퇴", split: ["a", "b"] }),
      exp({ amount: 9_000, payerId: "a", split: [] }),
      exp({ amount: 9_000, payerId: "a", split: ["탈퇴"] }),
    ]);
    expect(r.total).toBe(0);
    expect(r.transfers).toEqual([]);
  });

  it("나머지 원은 split 배열 순서가 아니라 멤버 순서를 따른다", () => {
    const r = settle(members, [exp({ amount: 10, payerId: "c", split: ["c", "b", "a"] })], "c");
    // N빵 원값: a 4 · b 3 · c 3 → c 잔액 7, a −4, b −3. 덤탱이 c 가 끝전을 떠안아 a·b 는 0원으로 내림
    expect(r.bal).toEqual({ a: 0, b: 0, c: 0 });
    expect(r.takerCost).toBe(7);
  });

  it("덤탱이가 없는 멤버면 가장 많이 받을 사람", () => {
    const r = settle(members, [exp({ amount: 30_000, payerId: "b", split: ["a", "b", "c"] })], "없는사람");
    expect(r.taker).toBe("b");
  });

  it("멤버가 없으면 빈 결과", () => {
    const r = settle([], []);
    expect(r).toMatchObject({ total: 0, transfers: [], taker: null, takerCost: 0 });
  });

  it("-0 이 나오지 않는다", () => {
    const r = settle(members, [exp({ amount: 50, payerId: "a", split: ["a", "b"] })], "a");
    for (const v of Object.values(r.bal)) expect(Object.is(v, -0)).toBe(false);
  });
});

describe("settle — 무작위 불변식 (1원 단위)", () => {
  // 고정 시드 PRNG (mulberry32) — 실패하면 같은 입력으로 재현된다
  function rng(seed: number) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  it("300개 무작위 여행", () => {
    const rand = rng(20261006);
    const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

    for (let trip = 0; trip < 300; trip++) {
      const members = Array.from({ length: int(1, 12) }, (_, i) => m(`m${i}`));
      const ids = members.map((x) => x.id);
      const expenses = Array.from({ length: int(0, 25) }, () =>
        exp({
          amount: int(1, 2_000_000),
          payerId: ids[int(0, ids.length - 1)],
          split: ids.filter(() => rand() < 0.7),
          category: CATEGORIES[int(0, CATEGORIES.length - 1)],
        }),
      );
      const takerId = rand() < 0.5 ? ids[int(0, ids.length - 1)] : null;
      const r = settle(members, expenses, takerId);
      const ctx = `trip #${trip}`;

      // 지출 합계 = 계산 대상 지출 금액 합
      const valid = expenses.filter((e) => e.split.length > 0);
      expect(r.total, ctx).toBe(valid.reduce((s, e) => s + e.amount, 0));
      // 잔액 합은 0
      expect(Object.values(r.bal).reduce((s, v) => s + v, 0), ctx).toBe(0);
      // 덤탱이 말고는 모두 100원 단위
      for (const id of ids) if (id !== r.taker) expect(Math.abs(r.bal[id]) % SETTLE_UNIT, ctx).toBe(0);
      // 낸 돈 − 쓴 돈 = 잔액
      for (const id of ids) expect(r.paid[id] - r.owed[id], ctx).toBe(r.bal[id]);
      // 송금을 그대로 실행하면 모두 0원
      const after = { ...r.bal };
      for (const t of r.transfers) {
        expect(t.amount, ctx).toBeGreaterThan(0);
        after[t.from] += t.amount;
        after[t.to] -= t.amount;
      }
      for (const id of ids) expect(after[id], ctx).toBe(0);
      // greedy 매칭이라 송금 횟수는 인원 − 1 이하
      expect(r.transfers.length, ctx).toBeLessThanOrEqual(Math.max(0, ids.length - 1));
      // 금액은 모두 정수
      for (const t of r.transfers) expect(Number.isInteger(t.amount), ctx).toBe(true);
    }
  });
});
