import { describe, expect, it } from "vitest";
import { dayLabel, defaultExpenseDate, formatDate, tripBadge, tripDateRange } from "./dates";
import { percent, won } from "./format";

const trip = { start: "2026-10-10", end: "2026-10-11" };

describe("tripBadge", () => {
  it("여행 전 D-N / 여행 중 N일차 / 끝", () => {
    expect(tripBadge(trip, "2026-10-06")).toBe("D-4");
    expect(tripBadge(trip, "2026-10-10")).toBe("1일차");
    expect(tripBadge(trip, "2026-10-11")).toBe("2일차");
    expect(tripBadge(trip, "2026-10-12")).toBe("여행 끝");
    expect(tripBadge({ start: null, end: null }, "2026-10-12")).toBe("");
  });

  it("월말을 넘겨도 하루 단위로 센다", () => {
    expect(tripBadge({ start: "2026-11-01", end: null }, "2026-10-30")).toBe("D-2");
  });
});

describe("날짜 표시", () => {
  it("formatDate·dayLabel·tripDateRange", () => {
    expect(formatDate("2026-10-23")).toBe("10월 23일 (금)");
    expect(dayLabel(trip, "2026-10-11")).toBe("2일차 · ");
    expect(dayLabel(trip, "2026-10-06")).toBe("");
    expect(tripDateRange(trip)).toBe("10월 10일 (토) – 10월 11일 (일) · 1박 2일");
    expect(tripDateRange({ start: "2026-10-10", end: null })).toBe("10월 10일 (토) · 0박 1일");
  });
});

describe("defaultExpenseDate", () => {
  it("마지막 입력 날짜 → 오늘, 기간 밖이면 시작일/종료일", () => {
    expect(defaultExpenseDate(trip, "2026-10-06", "2026-10-11")).toBe("2026-10-11");
    expect(defaultExpenseDate(trip, "2026-10-06")).toBe("2026-10-10");
    expect(defaultExpenseDate(trip, "2026-10-20")).toBe("2026-10-11");
    expect(defaultExpenseDate(trip, "2026-10-10")).toBe("2026-10-10");
  });
});

describe("format", () => {
  it("won·percent", () => {
    expect(won(346_630)).toBe("346,630원");
    expect(percent(1, 300)).toBe("0.3%");
    expect(percent(150, 300)).toBe("50%");
    expect(percent(0, 0)).toBe("0%");
  });
});
