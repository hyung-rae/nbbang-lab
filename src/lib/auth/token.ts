import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/*
 * 관리자 세션 (2026-10-07 결정: 로그인은 관리자 한 명, 비밀번호). 참여자는 로그인 없이 여행 링크로 들어온다.
 * 쿠키 값 = "만료시각(ms).HMAC". 비밀번호는 쿠키에 넣지 않고, 서명 키를 바꾸면 모든 기기에서 로그아웃된다.
 */

export const SESSION_DAYS = 30;
const DAY_MS = 86_400_000;

function mac(secret: string, expires: number): string {
  return createHmac("sha256", secret).update(`admin.${expires}`).digest("base64url");
}

/** 길이가 달라도 시간 차이로 내용을 흘리지 않게 해시해서 비교한다 */
function sameText(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function signSession(secret: string, now = Date.now()): string {
  const expires = now + SESSION_DAYS * DAY_MS;
  return `${expires}.${mac(secret, expires)}`;
}

/** 서명이 맞고 만료 전이면 true. 형식이 틀리거나 변조·만료면 false */
export function verifySession(token: string, secret: string, now = Date.now()): boolean {
  const m = /^(\d{13})\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!m) return false;
  const expires = Number(m[1]);
  return expires > now && sameText(m[2], mac(secret, expires));
}

/*
 * 여행 입장 표 (2026-10-07: 여행별 입장 비밀번호). 쿠키 값 = "만료시각(ms).HMAC" — 관리자 세션과 같은 모양이고
 * 서명 대상 앞머리("trip.")로 구분한다. 서명에 지금 비밀번호의 해시를 섞어서, 관리자가 비밀번호를 바꾸면 이전에 받은 표가 모두 무효가 된다.
 */
function tripMac(secret: string, slug: string, password: string, expires: number): string {
  const pw = createHash("sha256").update(password).digest("base64url");
  return createHmac("sha256", secret).update(`trip.${slug}.${pw}.${expires}`).digest("base64url");
}

export function signTripPass(secret: string, slug: string, password: string, now = Date.now()): string {
  const expires = now + SESSION_DAYS * DAY_MS;
  return `${expires}.${tripMac(secret, slug, password, expires)}`;
}

/** 이 여행·지금 비밀번호로 서명됐고 만료 전이면 true */
export function verifyTripPass(token: string, secret: string, slug: string, password: string, now = Date.now()): boolean {
  const m = /^(\d{13})\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!m) return false;
  const expires = Number(m[1]);
  return expires > now && sameText(m[2], tripMac(secret, slug, password, expires));
}

export function samePassword(input: string, actual: string): boolean {
  return sameText(input, actual);
}

/**
 * 비밀번호 대입 막기 — 같은 키(IP)가 window 안에 max 번 틀리면 window 동안 막는다.
 * 서버 인스턴스 메모리라 인스턴스끼리 나누지 않는다(완전한 막음이 아님 → 비밀번호를 길게).
 */
export class FailureLimiter {
  private readonly fails = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  private recent(key: string, now: number): number[] {
    const list = (this.fails.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (list.length) this.fails.set(key, list);
    else this.fails.delete(key);
    return list;
  }

  blocked(key: string, now = Date.now()): boolean {
    return this.recent(key, now).length >= this.max;
  }

  fail(key: string, now = Date.now()): void {
    // 다시 오지 않는 키가 쌓이지 않게, 많아지면 만료된 것을 한 번에 치운다
    if (this.fails.size > 1000) for (const k of [...this.fails.keys()]) this.recent(k, now);
    this.fails.set(key, [...this.recent(key, now), now]);
  }

  reset(key: string): void {
    this.fails.delete(key);
  }
}
