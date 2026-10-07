import { describe, expect, it } from "vitest";
import { COLOR_COUNT, MAX_MEMBERS, expenseSchema, firstError, newTripSchema, settingsSchema, tripInfoSchema } from "./schema";

const uuid = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;

describe("여행 날짜 규칙 — 새 여행·여행 정보 수정이 같은 규칙", () => {
  for (const [label, schema, extra] of [
    ["newTripSchema", newTripSchema, { password: "pass1234" }],
    ["tripInfoSchema", tripInfoSchema, { address: "", password: "" }],
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

describe("settingsSchema — 설정 한 번에 저장", () => {
  const base = { trip: null, remove: [], colors: [], add: [] };

  it("여행 정보는 안 바뀌었으면 null, 바뀌었으면 날짜 규칙까지 적용", () => {
    expect(settingsSchema.parse(base)).toEqual(base);
    expect(
      settingsSchema.parse({ ...base, trip: { name: " 양평 ", start: "2026-11-01", end: "", address: "", password: " pass1234 " } })
        .trip,
    ).toEqual({
      name: "양평",
      start: "2026-11-01",
      end: "2026-11-01",
      address: null,
      password: "pass1234",
    });
  });

  it(`색은 0~${COLOR_COUNT - 1}`, () => {
    expect(settingsSchema.safeParse({ ...base, colors: [{ id: uuid(1), color: COLOR_COUNT - 1 }] }).success).toBe(true);
    expect(settingsSchema.safeParse({ ...base, colors: [{ id: uuid(1), color: COLOR_COUNT }] }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, add: [{ name: "형래", color: -1 }] }).success).toBe(false);
  });

  it("새 멤버 이름 검증 — 빈 이름·중복·인원 상한", () => {
    const empty = settingsSchema.safeParse({ ...base, add: [{ name: " ", color: 0 }] });
    expect(empty.success).toBe(false);
    if (!empty.success) expect(firstError(empty.error)).toBe("이름을 적어 주세요.");

    const dup = settingsSchema.safeParse({ ...base, add: [{ name: "형래", color: 0 }, { name: " 형래", color: 1 }] });
    expect(dup.success).toBe(false);
    if (!dup.success) expect(firstError(dup.error)).toBe("같은 이름이 이미 있어요. 구별되게 적어 주세요.");

    const many = Array.from({ length: MAX_MEMBERS + 1 }, (_, i) => ({ name: `m${i}`, color: 0 }));
    expect(settingsSchema.safeParse({ ...base, add: many }).success).toBe(false);
  });
});

describe("입장 비밀번호 — 새 여행은 필수 4~20자, 설정에서는 비울 수 있다", () => {
  const trip = { name: "가평", start: "", end: "" };

  it("새 여행: 비었거나 짧거나 길면 거부, 앞뒤 공백은 잘라 낸다", () => {
    for (const password of ["", "   ", "abc", "a".repeat(21)]) expect(newTripSchema.safeParse({ ...trip, password }).success).toBe(false);
    expect(newTripSchema.parse({ ...trip, password: " 1111 " }).password).toBe("1111");
    expect(newTripSchema.parse({ ...trip, password: "a".repeat(20) }).password).toHaveLength(20);
  });

  it("설정: 빈 값은 열린 여행(\"\"), 그 밖에는 4~20자", () => {
    const info = { ...trip, address: "" };
    expect(tripInfoSchema.parse({ ...info, password: "  " }).password).toBe("");
    expect(tripInfoSchema.safeParse({ ...info, password: "abc" }).success).toBe(false);
    expect(tripInfoSchema.safeParse({ ...info, password: "a".repeat(21) }).success).toBe(false);
  });
});
