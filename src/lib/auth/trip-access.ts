import "server-only";
import { cookies } from "next/headers";
import { getTripPasswords } from "@/lib/trips/queries";
import { isAdmin, sessionSecret } from "./admin";
import { verifyTripPass } from "./token";

/*
 * 여행 입장 판정 (2026-10-07: 여행별 입장 비밀번호). 여행 화면·서버 액션·여행 목록이 같이 쓴다.
 * 들어갈 수 있다 = 비밀번호 없는 여행 · 관리자 · 이 여행·지금 비밀번호로 서명된 입장 표(쿠키)
 */

type CookieJar = Awaited<ReturnType<typeof cookies>>;

/** 여행마다 쿠키 하나. slug 는 영숫자뿐이라 쿠키 이름에 그대로 쓴다 */
export function tripCookieName(slug: string): string {
  return `nb_trip_${slug}`;
}

/** 서명 키가 없으면 아무도 표를 가질 수 없다 — 비밀번호 있는 여행은 관리자만 들어간다 */
function holdsPass(jar: CookieJar, slug: string, password: string): boolean {
  const token = jar.get(tripCookieName(slug))?.value;
  const secret = sessionSecret();
  return !!secret && !!token && verifyTripPass(token, secret, slug, password);
}

export async function canEnterTrip(slug: string, password: string | null): Promise<boolean> {
  if (password === null) return true;
  if (await isAdmin()) return true;
  return holdsPass(await cookies(), slug, password);
}

/**
 * 여행 목록용: 지금 이 사람이 비밀번호를 넣어야 들어갈 수 있는 여행 slug (관리자면 비어 있다).
 * 자물쇠 표시와 같은 근거(목록의 hasPassword)로 정하고, 비밀번호는 입장 표 쿠키가 있는 여행만 읽어 검증한다
 */
export async function lockedTripSlugs(trips: { slug: string; hasPassword: boolean }[]): Promise<Set<string>> {
  if (await isAdmin()) return new Set();
  const jar = await cookies();
  const guarded = trips.filter((t) => t.hasPassword).map((t) => t.slug);
  const passwords = await getTripPasswords(guarded.filter((slug) => jar.has(tripCookieName(slug))));
  // 그사이 비밀번호가 지워진 여행(passwords 에 없음)은 들어가 보면 바로 열린다 — 잠김으로 두어도 창에서 enterTrip 이 ok 를 준다
  return new Set(guarded.filter((slug) => !passwords.has(slug) || !holdsPass(jar, slug, passwords.get(slug)!)));
}
