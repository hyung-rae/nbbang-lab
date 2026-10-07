// 몰빵 게임 로직 — 화면에서만 돌고 저장하지 않는다 (명세 게임 탭 절). 화면 코드와 분리해 테스트한다.

export const MISSIONS = ["이번 계산", "설거지", "고기 굽기", "심부름"] as const;
export type Mission = (typeof MISSIONS)[number];

/** [0, n) 정수 */
export type RandInt = (n: number) => number;

export const secureRandInt: RandInt = (n) => {
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  } catch {
    return Math.floor(Math.random() * n);
  }
};

export function shuffle<T>(arr: readonly T[], rand: RandInt = secureRandInt): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 받침 유무로 조사 고르기: josa("이번 계산", "은", "는") → "이번 계산은" */
export function josa(word: string, withBatchim: string, without: string): string {
  const c = word.charCodeAt(word.length - 1);
  const has = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
  return word + (has ? withBatchim : without);
}

// ---------------------------------------------------------------- 룰렛

/**
 * 룰렛 최종 각도. 바늘은 12시 방향(0°), i번째 칸은 i*s ~ (i+1)*s (시계 방향).
 * 6바퀴 이상 돌고 winner 칸 가운데(± jitter)에서 멈춘다.
 */
export function wheelTargetAngle(n: number, winner: number, from: number, jitterRatio: number): number {
  const s = 360 / n;
  const center = (winner + 0.5) * s;
  const jitter = jitterRatio * s * 0.7; // jitterRatio ∈ [-0.5, 0.5] → 칸 경계에서 15% 이상 떨어짐
  return from + 360 * 6 + ((((-center + jitter - from) % 360) + 360) % 360);
}

/** 각도 angle 로 돌아간 룰렛에서 바늘이 가리키는 칸 */
export function wheelIndexAt(n: number, angle: number): number {
  const s = 360 / n;
  const a = (((-angle % 360) + 360) % 360) / s;
  return Math.floor(a) % n;
}

export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

// ---------------------------------------------------------------- 사다리

export const LADDER_LEVELS = 9;
export const LADDER_H = 240;
export const ladderX = (col: number) => (col + 0.5) * 60;
export const ladderY = (level: number) => 22 + level * (196 / (LADDER_LEVELS - 1));

export type Point = [number, number];

export interface Ladder {
  /** rungs[level][gap] — gap 번째 세로줄과 그 오른쪽 세로줄을 잇는 가로줄 */
  rungs: boolean[][];
  /** 출발 i 의 경로와 도착 칸 */
  paths: { pts: Point[]; end: number }[];
  /** 당첨 도착 칸 */
  prize: number;
}

export function newLadder(n: number, rand: RandInt = secureRandInt, random: () => number = Math.random): Ladder {
  const rungs: boolean[][] = [];
  for (let k = 0; k < LADDER_LEVELS; k++) {
    const row: boolean[] = [];
    // 같은 높이에서 가로줄이 이어 붙지 않게
    for (let j = 0; j < n - 1; j++) row.push(!row[j - 1] && random() < 0.45);
    rungs.push(row);
  }
  // 가로줄이 하나도 없는 칸이 없도록 보충 (없으면 그 칸 양쪽 사람끼리는 절대 안 섞인다).
  // 아티팩트판은 양옆이 막힌 높이만 있으면 보충을 포기했다 → 오른쪽 가로줄은 비켜 낸다(오른쪽 칸은 다음 차례에 다시 채움).
  // 왼쪽 칸은 이미 채워졌으므로, 왼쪽 가로줄은 그 칸에 다른 가로줄이 남을 때만 비켜 낸다.
  const count = (j: number) => rungs.filter((r) => r[j]).length;
  for (let j = 0; j < n - 1; j++) {
    if (count(j) > 0) continue;
    const k0 = rand(LADDER_LEVELS);
    const order = Array.from({ length: LADDER_LEVELS }, (_, t) => rungs[(k0 + t) % LADDER_LEVELS]);
    const row =
      order.find((r) => !r[j - 1] && !r[j + 1]) ??
      order.find((r) => !r[j - 1]) ??
      order.find(() => count(j - 1) > 1)!;
    if (row[j - 1]) row[j - 1] = false;
    row[j + 1] = false;
    row[j] = true;
  }
  const paths = Array.from({ length: n }, (_, i) => {
    let col = i;
    const pts: Point[] = [[ladderX(col), 0]];
    rungs.forEach((r, k) => {
      const y = ladderY(k);
      if (r[col]) {
        pts.push([ladderX(col), y]);
        col++;
        pts.push([ladderX(col), y]);
      } else if (col > 0 && r[col - 1]) {
        pts.push([ladderX(col), y]);
        col--;
        pts.push([ladderX(col), y]);
      }
    });
    pts.push([ladderX(col), LADDER_H]);
    return { pts, end: col };
  });
  return { rungs, paths, prize: rand(n) };
}

/** 경로를 t(0~1)만큼만 그린 polyline points */
export function partialPoints(pts: Point[], t: number): string {
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
    segs.push(d);
    total += d;
  }
  let left = total * Math.max(0, Math.min(1, t));
  const out: Point[] = [pts[0]];
  for (let i = 1; i < pts.length && left > 0; i++) {
    if (left >= segs[i - 1]) {
      out.push(pts[i]);
      left -= segs[i - 1];
    } else {
      const f = left / segs[i - 1];
      out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]);
      left = 0;
    }
  }
  return out.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
}

// ---------------------------------------------------------------- 폭탄

/** 7~18초 사이 아무 때나 터진다 */
export function bombFuseMs(random: () => number = Math.random): number {
  return 7000 + random() * 11000;
}
