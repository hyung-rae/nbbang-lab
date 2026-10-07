"use server";

import type { CurrentWeather } from "@/lib/domain/weather";
import { getTripCoords } from "@/lib/trips/queries";
import { fetchCurrentWeather } from "./open-meteo";

/**
 * 날씨 새로고침 버튼 — 그 여행 숙소의 지금 날씨를 캐시 없이 새로 받는다. 읽기 전용(DB 쓰기·변경 신호 없음).
 * 좌표는 인자로 받지 않고 DB 에서 읽는다 — 아무 좌표나 대신 조회해 주는 통로가 되지 않게.
 * 인증 전이라 링크를 아는 누구나 부를 수 있다 → 연타가 문제되면 여기서 간격 제한.
 */
export async function refreshWeather(slug: unknown): Promise<CurrentWeather | null> {
  if (typeof slug !== "string") return null;
  try {
    const coords = await getTripCoords(slug);
    return coords ? await fetchCurrentWeather(coords, { fresh: true }) : null;
  } catch (e) {
    console.error("[weather action]", e);
    return null;
  }
}
