import { describe, expect, it } from "vitest";
import { addressRegion } from "./address";

describe("addressRegion", () => {
  it("읍·면·동까지", () => {
    expect(addressRegion("경기 가평군 설악면 예시로 1")).toBe("경기 가평군 설악면");
    expect(addressRegion("제주특별자치도 서귀포시 성산읍 예시리 123-4")).toBe("제주특별자치도 서귀포시 성산읍");
    expect(addressRegion("강원특별자치도 강릉시 교동 12")).toBe("강원특별자치도 강릉시 교동");
  });

  it("읍·면·동이 없으면 시·군·구까지", () => {
    expect(addressRegion("서울 강남구 테헤란로 152")).toBe("서울 강남구");
    expect(addressRegion("세종특별자치시 한누리대로 2130")).toBe("세종특별자치시");
  });

  it("더 줄일 게 없거나 지역을 못 찾으면 null", () => {
    expect(addressRegion("경기 가평군 설악면")).toBeNull();
    expect(addressRegion("서울 강남구")).toBeNull();
    expect(addressRegion("어딘가 예시로 1")).toBeNull();
    expect(addressRegion("")).toBeNull();
  });

  it("공백이 여러 개여도", () => {
    expect(addressRegion("  경기  가평군 설악면   예시로 1 ")).toBe("경기 가평군 설악면");
  });
});
