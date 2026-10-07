"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminConfig } from "./admin";
import { FailureLimiter, SESSION_DAYS, samePassword, signSession } from "./token";

const limiter = new FailureLimiter(5, 10 * 60_000);
const FAIL_DELAY_MS = 500;

/** 실패만 돌아온다 — 성공하면 redirect 로 이동해 이 함수는 값을 돌려주지 않는다 */
export type LoginResult = { ok: false; error: string };

/** 관리자 로그인. 맞으면 세션 쿠키를 주고 홈으로 이동한다 (돌아오지 않음) */
export async function login(password: unknown): Promise<LoginResult> {
  const config = adminConfig();
  if (!config) return { ok: false, error: "관리자 로그인이 설정되지 않았어요." };

  // Vercel 이 채우는 x-real-ip 를 먼저 쓴다(x-forwarded-for 첫 값은 경로에 따라 클라이언트가 바꿀 수 있다)
  const h = await headers();
  const ip = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limiter.blocked(ip)) return { ok: false, error: "여러 번 틀려서 잠시 막았어요. 10분 뒤 다시 해 주세요." };

  if (typeof password !== "string" || !samePassword(password, config.password)) {
    limiter.fail(ip);
    await new Promise((r) => setTimeout(r, FAIL_DELAY_MS));
    return { ok: false, error: "비밀번호가 맞지 않아요." };
  }

  limiter.reset(ip);
  (await cookies()).set(ADMIN_COOKIE, signSession(config.secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  redirect("/");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/");
}
