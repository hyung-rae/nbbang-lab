import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCurrentWeather, parseCurrent } from "./open-meteo";

const body = {
  current: { time: "2026-10-07T14:00", interval: 900, weather_code: 3, temperature_2m: 17.6, apparent_temperature: 15.5 },
};

const coords = { lat: 37.75194, lng: 128.87612 };

afterEach(() => vi.unstubAllGlobals());

function stubFetch(res: () => Response | Promise<Response>) {
  const fn = vi.fn<typeof fetch>(async () => res());
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("parseCurrent", () => {
  it("current → CurrentWeather, 기온은 반올림", () => {
    expect(parseCurrent(body)).toEqual({ code: 3, temp: 18, feels: 16, time: "2026-10-07T14:00" });
  });

  it("형식이 다르면 null", () => {
    expect(parseCurrent({ error: true, reason: "x" })).toBeNull();
    expect(parseCurrent({ current: { ...body.current, temperature_2m: null } })).toBeNull();
    expect(parseCurrent(null)).toBeNull();
  });
});

describe("fetchCurrentWeather", () => {
  it("좌표(소수 둘째 자리)·한국 시간대로 요청, 기본은 5분 캐시", async () => {
    const fn = stubFetch(() => Response.json(body));
    expect(await fetchCurrentWeather(coords)).toEqual(parseCurrent(body));

    const [input, init] = fn.mock.calls[0] as [URL, RequestInit & { next?: { revalidate?: number } }];
    const url = new URL(String(input));
    expect(url.searchParams.get("latitude")).toBe("37.75");
    expect(url.searchParams.get("longitude")).toBe("128.88");
    expect(url.searchParams.get("timezone")).toBe("Asia/Seoul");
    expect(url.searchParams.get("current")).toContain("apparent_temperature");
    expect(init.next?.revalidate).toBe(300);
    expect(init.cache).toBeUndefined();
  });

  it("fresh 면 캐시를 건너뛴다", async () => {
    const fn = stubFetch(() => Response.json(body));
    await fetchCurrentWeather(coords, { fresh: true });
    const init = (fn.mock.calls[0] as [URL, RequestInit & { next?: unknown }])[1];
    expect(init.cache).toBe("no-store");
    expect(init.next).toBeUndefined();
  });

  it("HTTP 오류·네트워크 오류·형식 오류는 null", async () => {
    stubFetch(() => new Response("bad", { status: 400 }));
    expect(await fetchCurrentWeather(coords)).toBeNull();

    stubFetch(() => Promise.reject(new Error("timeout")));
    expect(await fetchCurrentWeather(coords)).toBeNull();

    stubFetch(() => Response.json({ current: {} }));
    expect(await fetchCurrentWeather(coords)).toBeNull();
  });
});
