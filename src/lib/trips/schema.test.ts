import { describe, expect, it } from "vitest";
import { MAX_MEMBERS, expenseSchema, firstError, newTripSchema, tripInfoSchema } from "./schema";

const uuid = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;

describe("여행 날짜 규칙 — 새 여행·여행 정보 수정이 같은 규칙", () => {
  for (const [label, schema, extra] of [
    ["newTripSchema", newTripSchema, {}],
    ["tripInfoSchema", tripInfoSchema, { address: "" }],
  ] as const) {
    it(`${label}: 종료일이 시작일보다 빠르면 거부, 한쪽만 있으면 같은 날로 채움`, () => {
      const bad = schema.safeParse({ name: "가평", start: "2026-10-11", end: "2026-10-10", ...extra });
      expect(bad.success).toBe(false);
      if (!bad.success) expect(firstError(bad.error)).toBe("종료일이 시작일보다 빨라요.");

      expect(schema.parse({ name: "가평", start: "2026-10-10", end: "", ...extra })).toMatchObject({
        start: "2026-10-10",
        end: "2026-10-10",
      });
      expect(schema.parse({ name: "가평", start: "", end: "2026-10-12", ...extra })).toMatchObject({
        start: "2026-10-12",
        end: "2026-10-12",
      });
      expect(schema.parse({ name: " 가평 ", start: "", end: "", ...extra })).toMatchObject({ name: "가평", start: null, end: null });
    });
  }
});

describe("expenseSchema", () => {
  const base = { id: null, amount: 1000, title: "커피", date: "2026-10-10", category: "카페·간식", payerId: uuid(1) };

  it(`나눌 사람은 1명 이상 ${MAX_MEMBERS}명 이하`, () => {
    expect(expenseSchema.safeParse({ ...base, split: [] }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...base, split: [uuid(1)] }).success).toBe(true);
    const many = Array.from({ length: MAX_MEMBERS + 1 }, (_, i) => uuid(i));
    const r = expenseSchema.safeParse({ ...base, split: many });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstError(r.error)).toBe("같이 나눌 사람이 너무 많아요.");
  });

  it("명세 순서대로 첫 오류 문구", () => {
    const r = expenseSchema.safeParse({ ...base, amount: 0, title: "", payerId: "", split: [] });
    expect(r.success).toBe(false);
    if (!r.success) expect(firstError(r.error)).toBe("금액을 입력해 주세요.");
  });
});
