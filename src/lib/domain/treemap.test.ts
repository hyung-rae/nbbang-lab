import { describe, expect, it } from "vitest";
import { categoryRows, layoutTreemap, treemapLabelLevel } from "./treemap";
import type { Expense, Member } from "./types";

const members: Member[] = [
  { id: "a", name: "a", color: 0 },
  { id: "b", name: "b", color: 1 },
];
const e = (category: Expense["category"], amount: number, payerId = "a"): Expense => ({
  id: `${category}${amount}`,
  date: "2026-10-10",
  title: category,
  category,
  amount,
  payerId,
  split: ["a", "b"],
});

describe("categoryRows", () => {
  it("분류별 합계·건수, 금액 큰 순, 정산 제외 지출은 빠진다", () => {
    const rows = categoryRows(members, [e("식비", 10_000), e("숙소", 300_000), e("식비", 5_000), e("교통", 99, "탈퇴")]);
    expect(rows).toEqual([
      { category: "숙소", amount: 300_000, count: 1 },
      { category: "식비", amount: 15_000, count: 2 },
    ]);
  });
});

describe("layoutTreemap", () => {
  const W = 360;
  const H = 240;

  it("사각형 넓이 합 = 영역 넓이, 모두 영역 안", () => {
    const rows = categoryRows(members, [
      e("숙소", 450_000),
      e("식비", 180_000),
      e("교통", 60_000),
      e("카페·간식", 24_000),
      e("관광·체험", 30_000),
      e("쇼핑", 1_000),
      e("기타", 500),
    ]);
    const rects = layoutTreemap(rows, W, H);
    expect(rects).toHaveLength(rows.length);
    const area = rects.reduce((s, r) => s + r.w * r.h, 0);
    expect(area).toBeCloseTo(W * H, 6);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(-1e-9);
      expect(r.y).toBeGreaterThanOrEqual(-1e-9);
      expect(r.x + r.w).toBeLessThanOrEqual(W + 1e-9);
      expect(r.y + r.h).toBeLessThanOrEqual(H + 1e-9);
    }
  });

  it("아주 작은 분류도 최소 1.5% 넓이를 받는다", () => {
    const rects = layoutTreemap(categoryRows(members, [e("숙소", 1_000_000), e("기타", 1)]), W, H);
    const tiny = rects.find((r) => r.item.category === "기타")!;
    expect((tiny.w * tiny.h) / (W * H)).toBeGreaterThan(0.014);
  });

  it("지출이 없거나 영역이 0이면 빈 배열", () => {
    expect(layoutTreemap([], W, H)).toEqual([]);
    expect(layoutTreemap(categoryRows(members, [e("식비", 1)]), 0, H)).toEqual([]);
  });
});

describe("treemapLabelLevel", () => {
  it("칸 크기에 따라 글자를 줄인다", () => {
    expect(treemapLabelLevel(100, 80)).toBe("full");
    expect(treemapLabelLevel(70, 50)).toBe("pct");
    expect(treemapLabelLevel(50, 30)).toBe("name");
    expect(treemapLabelLevel(30, 20)).toBe("none");
  });
});
