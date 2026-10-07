"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTripGate } from "@/lib/trips/queries";
import { ADMIN_COOKIE, adminConfig, sessionSecret } from "./admin";
import { FailureLimiter, SESSION_DAYS, samePassword, signSession, signTripPass } from "./token";
import { tripCookieName } from "./trip-access";

const limiter = new FailureLimiter(5, 10 * 60_000);
// 여행 입장은 "IP + 여행" 단위로 센다 — 한 여행을 틀려도 다른 여행 입장은 막지 않는다
const tripLimiter = new FailureLimiter(5, 10 * 60_000);
const FAIL_DELAY_MS = 500;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_DAYS * 86_400,
} as const;

/** Vercel 이 채우는 x-real-ip 를 먼저 쓴다(x-forwarded-for 첫 값은 경로에 따라 클라이언트가 바꿀 수 있다) */
async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** 실패만 돌아온다 — 성공하면 redirect 로 이동해 이 함수는 값을 돌려주지 않는다 */
export type LoginResult = { ok: false; error: string };

/** 관리자 로그인. 맞으면 세션 쿠키를 주고 홈으로 이동한다 (돌아오지 않음) */
export async function login(password: unknown): Promise<LoginResult> {
  const config = adminConfig();
  if (!config) return { ok: false, error: "관리자 로그인이 설정되지 않았어요." };

  const ip = await clientIp();
  if (limiter.blocked(ip)) return { ok: false, error: "여러 번 틀려서 잠시 막았어요. 10분 뒤 다시 해 주세요." };

  if (typeof password !== "string" || !samePassword(password, config.password)) {
    limiter.fail(ip);
    await new Promise((r) => setTimeout(r, FAIL_DELAY_MS));
    return { ok: false, error: "비밀번호가 맞지 않아요." };
  }

  limiter.reset(ip);
  (await cookies()).set(ADMIN_COOKIE, signSession(config.secret), COOKIE_OPTIONS);
  redirect("/");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/");
}

export type EnterResult = { ok: true } | { ok: false; error: string };

/**
 * 여행 입장 — 비밀번호가 맞으면 이 여행 입장 표(쿠키, 30일)를 준다. 이동은 화면이 한다(목록 → 여행, 입장 화면 → 새로고침).
 * 비밀번호 없는 여행은 바로 ok. 틀리면 관리자 로그인과 같이 지연 + 횟수 제한
 */
export async function enterTrip(slug: unknown, password: unknown): Promise<EnterResult> {
  const gate = typeof slug === "string" ? await getTripGate(slug) : null;
  if (!gate || typeof slug !== "string") return { ok: false, error: "여행을 찾을 수 없어요. 링크를 다시 확인해 주세요." };
  if (gate.password === null) return { ok: true };
  const secret = sessionSecret();
  if (!secret) return { ok: false, error: "입장 확인이 설정되지 않았어요. 관리자에게 알려 주세요." };

  const key = `${await clientIp()}:${slug}`;
  if (tripLimiter.blocked(key)) return { ok: false, error: "여러 번 틀려서 잠시 막았어요. 10분 뒤 다시 해 주세요." };
  if (typeof password !== "string" || !samePassword(password.trim(), gate.password)) {
    tripLimiter.fail(key);
    await new Promise((r) => setTimeout(r, FAIL_DELAY_MS));
    return { ok: false, error: "비밀번호가 맞지 않아요." };
  }

  tripLimiter.reset(key);
  (await cookies()).set(tripCookieName(slug), signTripPass(secret, slug, gate.password), COOKIE_OPTIONS);
  return { ok: true };
}
