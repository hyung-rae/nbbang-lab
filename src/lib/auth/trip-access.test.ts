import { beforeEach, describe, expect, it, vi } from "vitest";
import { signTripPass } from "./token";

// 입장 판정이 "서버가 정본"이라는 보증 — 쿠키·관리자·DB 를 흉내 내고 판정 함수만 진짜로 돌린다
const state = vi.hoisted(() => ({
  admin: false,
  cookies: new Map<string, string>(),
  passwords: new Map<string, string>(),
  gates: new Map<string, { id: string; name: string; password: string | null; coords: null }>(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (state.cookies.has(name) ? { name, value: state.cookies.get(name) } : undefined),
    has: (name: string) => state.cookies.has(name),
  }),
}));
vi.mock("./admin", () => ({
  isAdmin: async () => state.admin,
  sessionSecret: () => SECRET,
}));
vi.mock("@/lib/trips/queries", () => ({
  getTripGate: async (slug: string) => state.gates.get(slug) ?? null,
  getTripPasswords: async (slugs: string[]) =>
    new Map([...state.passwords].filter(([slug]) => slugs.includes(slug))),
}));
// tripIdOf 를 거치는 액션을 직접 부르기 위한 나머지 의존성
vi.mock("next/cache", () => ({ refresh: () => {} }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("@/lib/realtime/notify", () => ({ notifyTripChanged: async () => {} }));
vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => {
    throw new Error("입장 판정에서 막혀야 DB 쓰기까지 오지 않는다");
  },
}));

const SECRET = "s".repeat(40);
const { canEnterTrip, lockedTripSlugs, tripCookieName } = await import("./trip-access");
const { setTaker } = await import("@/lib/trips/actions");

const OPEN = "opentrip0000";
const LOCKED = "lockedtrip00";

beforeEach(() => {
  state.admin = false;
  state.cookies.clear();
  state.passwords = new Map([[LOCKED, "pass1234"]]);
  state.gates = new Map([
    [OPEN, { id: "t-open", name: "열린 여행", password: null, coords: null }],
    [LOCKED, { id: "t-locked", name: "잠긴 여행", password: "pass1234", coords: null }],
  ]);
});

describe("canEnterTrip", () => {
  it("비밀번호 없는 여행은 누구나, 있는 여행은 표가 있어야", async () => {
    expect(await canEnterTrip(OPEN, null)).toBe(true);
    expect(await canEnterTrip(LOCKED, "pass1234")).toBe(false);
    state.cookies.set(tripCookieName(LOCKED), signTripPass(SECRET, LOCKED, "pass1234"));
    expect(await canEnterTrip(LOCKED, "pass1234")).toBe(true);
  });

  it("비밀번호가 바뀌면 옛 표로는 못 들어간다, 다른 여행 표도 안 된다", async () => {
    state.cookies.set(tripCookieName(LOCKED), signTripPass(SECRET, LOCKED, "pass1234"));
    expect(await canEnterTrip(LOCKED, "newpass1")).toBe(false);
    state.cookies.set(tripCookieName(LOCKED), signTripPass(SECRET, OPEN, "pass1234"));
    expect(await canEnterTrip(LOCKED, "pass1234")).toBe(false);
  });

  it("관리자는 표 없이 들어간다", async () => {
    state.admin = true;
    expect(await canEnterTrip(LOCKED, "pass1234")).toBe(true);
  });
});

describe("lockedTripSlugs (여행 목록)", () => {
  const trips = [
    { slug: OPEN, hasPassword: false },
    { slug: LOCKED, hasPassword: true },
  ];

  it("표 없는 비밀번호 여행만 잠김, 표가 있으면 풀림, 관리자는 없음", async () => {
    expect([...(await lockedTripSlugs(trips))]).toEqual([LOCKED]);
    state.cookies.set(tripCookieName(LOCKED), signTripPass(SECRET, LOCKED, "pass1234"));
    expect([...(await lockedTripSlugs(trips))]).toEqual([]);
    state.admin = true;
    state.cookies.clear();
    expect([...(await lockedTripSlugs(trips))]).toEqual([]);
  });

  it("목록을 읽은 뒤 비밀번호가 지워졌으면 잠김으로 둔다(창에서 enterTrip 이 바로 통과)", async () => {
    state.cookies.set(tripCookieName(LOCKED), "1.forged");
    state.passwords.clear();
    expect([...(await lockedTripSlugs(trips))]).toEqual([LOCKED]);
  });
});

describe("여행 액션은 입장 표가 없으면 DB 에 닿기 전에 거절한다 (tripIdOf)", () => {
  it("비밀번호 여행 + 표 없음 → 거절 문구", async () => {
    expect(await setTaker(LOCKED, null)).toEqual({ ok: false, error: "여행 입장 비밀번호를 먼저 입력해 주세요." });
  });

  it("없는 여행 → 찾을 수 없음", async () => {
    expect(await setTaker("nosuchtrip00", null)).toEqual({
      ok: false,
      error: "여행을 찾을 수 없어요. 링크를 다시 확인해 주세요.",
    });
  });
});
