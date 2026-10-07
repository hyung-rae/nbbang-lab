import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { geocode, parseGeocode } from "./geocode";

const hit = { status: "OK", addresses: [{ roadAddress: "예시", x: "127.5031", y: "37.6575" }] };
const none = { status: "OK", addresses: [] };

function stubFetch(...bodies: (object | Response | Error)[]) {
  const fn = vi.fn<typeof fetch>(async () => {
    const b = bodies.shift();
    if (b instanceof Error) throw b;
    return b instanceof Response ? b : Response.json(b);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const queryOf = (fn: ReturnType<typeof stubFetch>, i: number) =>
  new URL(String(fn.mock.calls[i][0])).searchParams.get("query");

beforeEach(() => {
  vi.stubEnv("NAVER_MAPS_API_KEY_ID", "id");
  vi.stubEnv("NAVER_MAPS_API_KEY", "secret");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("parseGeocode", () => {
  it("첫 결과 x·y 문자열 → 숫자 좌표", () => {
    expect(parseGeocode(hit)).toEqual({ lat: 37.6575, lng: 127.5031 });
  });

  it("0건·형식 오류는 null", () => {
    expect(parseGeocode(none)).toBeNull();
    expect(parseGeocode({ errorMessage: "x" })).toBeNull();
    expect(parseGeocode({ addresses: [{ x: "abc", y: "1" }] })).toBeNull();
  });
});

describe("geocode", () => {
  it("주소로 찾고 키를 헤더로 보낸다", async () => {
    const fn = stubFetch(hit);
    expect(await geocode("경기 가평군 설악면 예시로 1")).toEqual({ lat: 37.6575, lng: 127.5031 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(queryOf(fn, 0)).toBe("경기 가평군 설악면 예시로 1");
    const headers = new Headers(fn.mock.calls[0][1]?.headers);
    expect(headers.get("x-ncp-apigw-api-key-id")).toBe("id");
    expect(headers.get("x-ncp-apigw-api-key")).toBe("secret");
  });

  it("0건이면 지역 부분으로 한 번 더", async () => {
    const fn = stubFetch(none, hit);
    expect(await geocode("경기 가평군 설악면 예시로 1")).toEqual({ lat: 37.6575, lng: 127.5031 });
    expect(queryOf(fn, 1)).toBe("경기 가평군 설악면");
  });

  it("다시 찾아도 없으면 null, 줄일 게 없으면 한 번만", async () => {
    expect(await (stubFetch(none, none), geocode("경기 가평군 설악면 예시로 1"))).toBeNull();
    const fn = stubFetch(none);
    expect(await geocode("경기 가평군 설악면")).toBeNull();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("HTTP 오류·네트워크 오류는 null (예외 없음)", async () => {
    stubFetch(new Response("unauthorized", { status: 401 }), none);
    expect(await geocode("서울 강남구 테헤란로 152")).toBeNull();
    stubFetch(new Error("timeout"));
    expect(await geocode("서울 강남구 테헤란로 152")).toBeNull();
  });

  it("키가 없으면 부르지 않고 null", async () => {
    vi.stubEnv("NAVER_MAPS_API_KEY", "");
    const fn = stubFetch(hit);
    expect(await geocode("서울 강남구 테헤란로 152")).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });
});
