"use server";

import { canEnterTrip } from "@/lib/auth/trip-access";
import type { CurrentWeather } from "@/lib/domain/weather";
import { getTripGate } from "@/lib/trips/queries";
import { fetchCurrentWeather } from "./open-meteo";

/**
 * 날씨 새로고침 버튼 — 그 여행 숙소의 지금 날씨를 캐시 없이 새로 받는다. 읽기 전용(DB 쓰기·변경 신호 없음).
 * 좌표는 인자로 받지 않고 DB 에서 읽는다 — 아무 좌표나 대신 조회해 주는 통로가 되지 않게.
 * 입장 비밀번호가 있는 여행은 입장 표가 있어야 한다. 연타가 문제되면 여기서 간격 제한.
 */
export async function refreshWeather(slug: unknown): Promise<CurrentWeather | null> {
  if (typeof slug !== "string") return null;
  try {
    // 입장 판정과 좌표를 한 번에 읽는다
    const gate = await getTripGate(slug);
    if (!gate?.coords || !(await canEnterTrip(slug, gate.password))) return null;
    return await fetchCurrentWeather(gate.coords, { fresh: true });
  } catch (e) {
    console.error("[weather action]", e);
    return null;
  }
}
