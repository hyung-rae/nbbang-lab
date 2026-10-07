import { z } from "zod";
import type { CurrentWeather } from "@/lib/domain/weather";

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";
/** 첫 화면은 같은 좌표의 날씨를 5분 동안 Next 데이터 캐시에서 꺼낸다 (Open-Meteo 현재 값은 15분 간격) */
const REVALIDATE_SECONDS = 5 * 60;
/** 날씨가 늦어도 티켓 아래 화면은 먼저 뜨지만, 줄이 오래 비어 있지 않게 끊는다 */
const TIMEOUT_MS = 3000;

const CurrentResponse = z.object({
  current: z.object({
    time: z.string(),
    weather_code: z.number(),
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
  }),
});

/** Open-Meteo current 응답 → CurrentWeather. 형식이 다르면 null */
export function parseCurrent(json: unknown): CurrentWeather | null {
  const parsed = CurrentResponse.safeParse(json);
  if (!parsed.success) return null;
  const c = parsed.data.current;
  return {
    code: c.weather_code,
    temp: Math.round(c.temperature_2m),
    feels: Math.round(c.apparent_temperature),
    time: c.time,
  };
}

/**
 * 좌표의 지금 날씨. 실패하면 null — 예외를 화면까지 올리지 않는다.
 * fresh: 새로고침 버튼 — 캐시를 건너뛴다 (데이터 캐시는 만료 뒤 첫 요청에 옛 값을 주므로 revalidate 로는 안 된다)
 */
export async function fetchCurrentWeather(
  coords: { lat: number; lng: number },
  { fresh = false }: { fresh?: boolean } = {},
): Promise<CurrentWeather | null> {
  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({
    // 소수 둘째 자리(약 1km)로 맞춰 가까운 숙소끼리 캐시를 같이 쓴다. 날씨 격자는 이보다 훨씬 굵다
    latitude: coords.lat.toFixed(2),
    longitude: coords.lng.toFixed(2),
    current: "weather_code,temperature_2m,apparent_temperature",
    timezone: "Asia/Seoul",
  }).toString();
  try {
    const res = await fetch(url, {
      ...(fresh ? { cache: "no-store" } : { next: { revalidate: REVALIDATE_SECONDS } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return parseCurrent(await res.json());
  } catch {
    return null;
  }
}
