import { describe, expect, it } from "vitest";
import { newerWeather, weatherOf, weatherTime } from "./weather";

describe("weatherOf", () => {
  it("WMO 코드 → 이모지·설명, 모르는 코드는 기본값", () => {
    expect(weatherOf(0)).toEqual({ icon: "☀️", label: "맑음" });
    expect(weatherOf(3)).toEqual({ icon: "☁️", label: "흐림" });
    expect(weatherOf(63).label).toBe("비");
    expect(weatherOf(75).label).toBe("눈");
    expect(weatherOf(99).label).toBe("뇌우");
    expect(weatherOf(42)).toEqual({ icon: "🌡️", label: "알 수 없음" });
  });
});

describe("newerWeather", () => {
  const at = (time: string) => ({ code: 0, temp: 18, feels: 16, time });

  it("관측 시각이 더 늦은 쪽, 같으면 앞쪽", () => {
    expect(newerWeather(at("2026-10-07T14:00"), at("2026-10-07T14:15"))?.time).toBe("2026-10-07T14:15");
    expect(newerWeather(at("2026-10-07T14:15"), at("2026-10-07T14:00"))?.time).toBe("2026-10-07T14:15");
    const a = at("2026-10-07T14:00");
    expect(newerWeather(a, at("2026-10-07T14:00"))).toBe(a);
  });

  it("한쪽이 없으면 있는 쪽", () => {
    expect(newerWeather(null, at("2026-10-07T14:00"))?.time).toBe("2026-10-07T14:00");
    expect(newerWeather(at("2026-10-07T14:00"), null)?.time).toBe("2026-10-07T14:00");
    expect(newerWeather(null, null)).toBeNull();
  });
});

describe("weatherTime", () => {
  it("시:분 기준", () => {
    expect(weatherTime("2026-10-07T14:00")).toBe("14:00 기준");
    expect(weatherTime("2026-10-07T09:45")).toBe("09:45 기준");
  });
});
