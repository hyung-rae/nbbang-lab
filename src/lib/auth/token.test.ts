import { describe, expect, it } from "vitest";
import {
  FailureLimiter,
  SESSION_DAYS,
  samePassword,
  signSession,
  signTripPass,
  verifySession,
  verifyTripPass,
} from "./token";

const secret = "x".repeat(40);
const now = Date.UTC(2026, 9, 7);
const DAY = 86_400_000;

describe("세션 서명", () => {
  it("방금 만든 세션은 유효, 만료 직전까지 유효, 만료 후 무효", () => {
    const t = signSession(secret, now);
    expect(verifySession(t, secret, now)).toBe(true);
    expect(verifySession(t, secret, now + SESSION_DAYS * DAY - 1)).toBe(true);
    expect(verifySession(t, secret, now + SESSION_DAYS * DAY)).toBe(false);
  });

  it("다른 서명 키·변조·형식 오류는 무효", () => {
    const t = signSession(secret, now);
    expect(verifySession(t, "y".repeat(40), now)).toBe(false);
    const [exp, sig] = t.split(".");
    // 만료 시각을 늘려도 서명이 안 맞는다
    expect(verifySession(`${Number(exp) + DAY}.${sig}`, secret, now)).toBe(false);
    expect(verifySession(`${exp}.${sig.slice(0, -1)}A`, secret, now)).toBe(false);
    expect(verifySession("", secret, now)).toBe(false);
    expect(verifySession("abc.def", secret, now)).toBe(false);
    expect(verifySession(`${exp}.${sig}.extra`, secret, now)).toBe(false);
  });
});

describe("여행 입장 표", () => {
  const slug = "abcdefghijkl";

  it("같은 여행·같은 비밀번호·만료 전에만 유효", () => {
    const t = signTripPass(secret, slug, "pass1234", now);
    expect(verifyTripPass(t, secret, slug, "pass1234", now)).toBe(true);
    expect(verifyTripPass(t, secret, slug, "pass1234", now + SESSION_DAYS * DAY - 1)).toBe(true);
    expect(verifyTripPass(t, secret, slug, "pass1234", now + SESSION_DAYS * DAY)).toBe(false);
  });

  it("비밀번호를 바꾸면·다른 여행이면·다른 키면 무효", () => {
    const t = signTripPass(secret, slug, "pass1234", now);
    expect(verifyTripPass(t, secret, slug, "newpass1", now)).toBe(false);
    expect(verifyTripPass(t, secret, "otherslug000", "pass1234", now)).toBe(false);
    expect(verifyTripPass(t, "y".repeat(40), slug, "pass1234", now)).toBe(false);
  });

  it("관리자 세션 쿠키 값으로는 여행에 못 들어가고, 그 반대도 안 된다", () => {
    expect(verifyTripPass(signSession(secret, now), secret, slug, "pass1234", now)).toBe(false);
    expect(verifySession(signTripPass(secret, slug, "pass1234", now), secret, now)).toBe(false);
  });

  it("변조·형식 오류는 무효", () => {
    const [exp, sig] = signTripPass(secret, slug, "pass1234", now).split(".");
    expect(verifyTripPass(`${Number(exp) + DAY}.${sig}`, secret, slug, "pass1234", now)).toBe(false);
    expect(verifyTripPass("", secret, slug, "pass1234", now)).toBe(false);
    expect(verifyTripPass(`${exp}.${sig}.x`, secret, slug, "pass1234", now)).toBe(false);
  });
});

describe("samePassword", () => {
  it("같을 때만 true, 길이가 달라도 예외 없음", () => {
    expect(samePassword("correct horse", "correct horse")).toBe(true);
    expect(samePassword("correct hors", "correct horse")).toBe(false);
    expect(samePassword("", "correct horse")).toBe(false);
  });
});

describe("FailureLimiter", () => {
  it("window 안에 max 번 틀리면 막고, window 가 지나면 풀린다", () => {
    const l = new FailureLimiter(3, 10_000);
    for (let i = 0; i < 2; i++) l.fail("ip", now + i);
    expect(l.blocked("ip", now + 2)).toBe(false);
    l.fail("ip", now + 3);
    expect(l.blocked("ip", now + 4)).toBe(true);
    expect(l.blocked("other", now + 4)).toBe(false);
    expect(l.blocked("ip", now + 10_001)).toBe(false);
  });

  it("키가 많아지면 만료된 키를 치운다", () => {
    const l = new FailureLimiter(5, 1000);
    for (let i = 0; i < 1001; i++) l.fail(`ip${i}`, now);
    l.fail("new", now + 2000);
    expect(l.blocked("ip0", now + 2000)).toBe(false);
    expect((l as unknown as { fails: Map<string, number[]> }).fails.size).toBe(1);
  });

  it("성공하면 초기화", () => {
    const l = new FailureLimiter(2, 10_000);
    l.fail("ip", now);
    l.fail("ip", now);
    l.reset("ip");
    expect(l.blocked("ip", now)).toBe(false);
  });
});
