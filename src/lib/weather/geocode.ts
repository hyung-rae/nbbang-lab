import { z } from "zod";
import { addressRegion } from "@/lib/domain/address";

// NAVER Cloud Platform Maps — Geocoding. 키는 서버 전용(.env.example)
const ENDPOINT = "https://maps.apigw.ntruss.com/map-geocode/v2/geocode";
/** 주소 저장이 이만큼 이상 늦어지지 않게 끊는다 (실패하면 좌표만 비고 주소는 저장된다) */
const TIMEOUT_MS = 3000;

// x(경도)·y(위도)는 문자열로 온다
const GeocodeResponse = z.object({
  addresses: z.array(z.object({ x: z.coerce.number(), y: z.coerce.number() })),
});

export type Coords = { lat: number; lng: number };

/** 첫 결과의 좌표. 0건·형식 오류면 null */
export function parseGeocode(json: unknown): Coords | null {
  const parsed = GeocodeResponse.safeParse(json);
  const first = parsed.success ? parsed.data.addresses[0] : undefined;
  if (!first || !Number.isFinite(first.x) || !Number.isFinite(first.y)) return null;
  return { lat: first.y, lng: first.x };
}

async function query(q: string, keyId: string, key: string): Promise<Coords | null> {
  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({ query: q, count: "1" }).toString();
  const res = await fetch(url, {
    headers: { "x-ncp-apigw-api-key-id": keyId, "x-ncp-apigw-api-key": key, accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    console.error("[geocode]", res.status, await res.text().catch(() => ""));
    return null;
  }
  return parseGeocode(await res.json());
}

/**
 * 숙소 주소 → 좌표. 못 찾으면 지역 부분(읍·면·동까지)으로 한 번 더.
 * 키가 없거나 실패하면 null — 예외를 올리지 않는다 (주소 저장은 성공해야 한다)
 */
export async function geocode(address: string): Promise<Coords | null> {
  const keyId = process.env.NAVER_MAPS_API_KEY_ID;
  const key = process.env.NAVER_MAPS_API_KEY;
  if (!keyId || !key) return null;
  try {
    const hit = await query(address, keyId, key);
    if (hit) return hit;
    const region = addressRegion(address);
    return region ? await query(region, keyId, key) : null;
  } catch (e) {
    console.error("[geocode]", e);
    return null;
  }
}
