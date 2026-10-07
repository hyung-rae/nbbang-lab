import { describe, expect, it } from "vitest";
import { todayIn } from "./dates";
import { groupByDate, perPersonLabel, settlementText, splitSummary, usageCount } from "./expense-view";
import { settle } from "./settle";
import type { Expense, Member } from "./types";

const members: Member[] = ["기준", "욱진", "연제", "형래"].map((name, i) => ({ id: name, name, color: i }));
const all = members.map((m) => m.id);
const e = (p: Partial<Expense>): Expense => ({
  id: "x", date: "2026-10-10", title: "t", category: "식비", amount: 10_000, payerId: "욱진", split: all, ...p,
});

describe("splitSummary·perPersonLabel", () => {
  it("나눈 방식 문구", () => {
    expect(splitSummary(members, e({}))).toBe("모두 N빵");
    expect(splitSummary(members, e({ split: ["기준", "연제"] }))).toBe("2명 N빵");
    expect(splitSummary(members, e({ split: ["욱진"] }))).toBe("혼자 부담");
    expect(splitSummary(members, e({ split: ["형래"] }))).toBe("형래 몫");
    expect(splitSummary(members, e({ split: [] }))).toBe("나눌 사람 없음");
  });

  it("1인 금액 — 나누어떨어지지 않으면 '약'", () => {
    expect(perPersonLabel(members, e({ amount: 346_630 }))).toBe("1인 약 86,657원");
    expect(perPersonLabel(members, e({ amount: 40_000 }))).toBe("1인 10,000원");
    expect(perPersonLabel(members, e({ split: ["형래"] }))).toBeNull();
  });
});

describe("groupByDate", () => {
  it("연속한 같은 날짜끼리 묶고 합계", () => {
    const g = groupByDate([e({ id: "a", date: "2026-10-11", amount: 1 }), e({ id: "b", date: "2026-10-11", amount: 2 }), e({ id: "c", date: "2026-10-10", amount: 4 })]);
    expect(g.map((x) => [x.date, x.sum, x.expenses.length])).toEqual([["2026-10-11", 3, 2], ["2026-10-10", 4, 1]]);
  });
});

describe("settlementText", () => {
  it("명세 형식", () => {
    const r = settle(members, [e({ amount: 346_630, category: "숙소" })], "욱진");
    expect(settlementText("26년 가을", members, r)).toBe(
      ["[26년 가을] 정산", "총 지출 346,630원", "덤탱이 쓸 사람 욱진 (끝전 +172원)", "",
        "기준 → 욱진  86,600원", "연제 → 욱진  86,600원", "형래 → 욱진  86,600원"].join("\n"),
    );
  });
});

describe("usageCount·todayIn", () => {
  it("결제자이거나 나눌 사람이면 센다", () => {
    expect(usageCount("기준", [e({ split: ["기준"] }), e({ payerId: "기준", split: ["욱진"] }), e({ split: ["욱진"] })])).toBe(2);
  });

  it("UTC 15시 = 서울 다음날 0시", () => {
    expect(todayIn("Asia/Seoul", new Date("2026-10-09T15:00:00Z"))).toBe("2026-10-10");
    expect(todayIn("Asia/Seoul", new Date("2026-10-09T14:59:59Z"))).toBe("2026-10-09");
  });
});
