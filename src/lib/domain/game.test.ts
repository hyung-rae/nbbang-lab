import { describe, expect, it } from "vitest";
import {
  LADDER_LEVELS,
  bombFuseMs,
  josa,
  newLadder,
  partialPoints,
  shuffle,
  wheelIndexAt,
  wheelTargetAngle,
} from "./game";

describe("josa", () => {
  it("받침 있으면 앞, 없으면 뒤", () => {
    expect(josa("이번 계산", "은", "는")).toBe("이번 계산은");
    expect(josa("설거지", "은", "는")).toBe("설거지는");
    expect(josa("고기 굽기", "은", "는")).toBe("고기 굽기는");
    expect(josa("심부름", "은", "는")).toBe("심부름은");
  });
});

describe("룰렛", () => {
  it("멈춘 각도에서 바늘이 당첨 칸을 가리킨다 (모든 인원·당첨·흔들림)", () => {
    for (let n = 2; n <= 12; n++) {
      for (let w = 0; w < n; w++) {
        for (const jitter of [-0.5, -0.2, 0, 0.3, 0.5]) {
          for (const from of [0, 123.4, 359.9, 1080]) {
            const to = wheelTargetAngle(n, w, from, jitter);
            expect(to - from, `n=${n} w=${w}`).toBeGreaterThanOrEqual(360 * 6);
            expect(wheelIndexAt(n, to), `n=${n} w=${w} j=${jitter} from=${from}`).toBe(w);
          }
        }
      }
    }
  });
});

describe("사다리", () => {
  it("도착 칸이 모두 다르고(순열), 모든 칸 사이에 가로줄이 있고, 가로줄이 이어 붙지 않는다", () => {
    for (let trial = 0; trial < 5000; trial++) {
      const n = 2 + (trial % 11);
      const L = newLadder(n);
      expect(new Set(L.paths.map((p) => p.end)).size).toBe(n);
      expect(L.rungs).toHaveLength(LADDER_LEVELS);
      for (let j = 0; j < n - 1; j++) expect(L.rungs.some((r) => r[j]), `gap ${j}`).toBe(true);
      for (const r of L.rungs) for (let j = 1; j < r.length; j++) expect(r[j] && r[j - 1]).toBe(false);
      expect(L.prize).toBeGreaterThanOrEqual(0);
      expect(L.prize).toBeLessThan(n);
    }
  });

  it("가로줄이 하나도 안 나와도 보충된다", () => {
    const L = newLadder(5, () => 0, () => 0.99);
    for (let j = 0; j < 4; j++) expect(L.rungs.some((r) => r[j])).toBe(true);
  });

  it("partialPoints — 0이면 시작점, 1이면 전체 경로", () => {
    const pts: [number, number][] = [[30, 0], [30, 100], [90, 100], [90, 240]];
    expect(partialPoints(pts, 0)).toBe("30.0,0.0");
    expect(partialPoints(pts, 1)).toBe("30.0,0.0 30.0,100.0 90.0,100.0 90.0,240.0");
    // 총 길이 300 의 절반 = 150 → 세로 100 을 지나 가로 구간에서 50 만큼 간 곳 (x 30→80)
    expect(partialPoints(pts, 0.5)).toBe("30.0,0.0 30.0,100.0 80.0,100.0");
  });
});

describe("shuffle·bombFuseMs", () => {
  it("shuffle 은 원소를 잃지 않는다", () => {
    const a = ["a", "b", "c", "d", "e"];
    expect(shuffle(a).sort()).toEqual(a);
  });

  it("폭탄은 7~18초", () => {
    expect(bombFuseMs(() => 0)).toBe(7000);
    expect(bombFuseMs(() => 0.999999)).toBeLessThan(18000);
  });
});
