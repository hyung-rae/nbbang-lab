import type { Expense, Member, MemberId } from "./types";

/** 송금을 끊는 단위 (원) */
export const SETTLE_UNIT = 100;

export interface Transfer {
  from: MemberId;
  to: MemberId;
  amount: number;
}

export interface Settlement {
  /** 직접 결제한 합계 */
  paid: Record<MemberId, number>;
  /** 쓴 돈. 100원 정리 후에는 paid - bal 로 다시 계산된 값이라 N빵 원값과 다르다 */
  owed: Record<MemberId, number>;
  /** 잔액 = paid - owed. 양수면 받을 돈, 음수면 보낼 돈 (100원 정리 후) */
  bal: Record<MemberId, number>;
  /** 계산에 들어간 지출 합계 */
  total: number;
  transfers: Transfer[];
  /** 덤탱이 쓸 사람. 멤버가 없으면 null */
  taker: MemberId | null;
  /** 100원 정리로 덤탱이 쓸 사람이 추가로 떠안는 끝전 */
  takerCost: number;
}

/** 균등 분할: 나머지 원은 앞사람부터 1원씩 */
export function splitEven(amount: number, n: number): number[] {
  const base = Math.floor(amount / n);
  const rem = amount - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

/** 나눌 사람을 멤버 순서대로 — 나머지 원 배분 순서가 여기서 정해진다. 없는 멤버는 빠진다 */
export function splitMembers(members: Member[], e: Expense): MemberId[] {
  return members.map((m) => m.id).filter((id) => e.split.includes(id));
}

/** 결제자가 없거나 나눌 사람이 0명인 지출은 계산에서 제외 */
export function isSettleable(members: Member[], e: Expense): boolean {
  return members.some((m) => m.id === e.payerId) && splitMembers(members, e).length > 0;
}

/** 지정이 없거나 없는 멤버면 가장 많이 받을 사람 (동률이면 멤버 순서상 앞사람) */
export function resolveTaker(
  members: Member[],
  bal: Record<MemberId, number>,
  takerId: MemberId | null | undefined,
): MemberId | null {
  if (takerId && members.some((m) => m.id === takerId)) return takerId;
  let best: MemberId | null = null;
  for (const m of members) if (best === null || bal[m.id] > bal[best]) best = m.id;
  return best;
}

function roundInFavor(b: number): number {
  // 보낼 돈은 내림, 받을 돈은 올림. `|| 0` 은 -0 제거
  return (b < 0 ? -Math.floor(-b / SETTLE_UNIT) * SETTLE_UNIT : Math.ceil(b / SETTLE_UNIT) * SETTLE_UNIT) || 0;
}

/**
 * 정산. 순서를 바꾸지 않는다 (CONVENTION.md 도메인 절):
 * 지출별 1원 단위 N빵 → 사람별 잔액 → 100원 단위 정리(끝전은 덤탱이) → 최소 송금
 */
export function settle(members: Member[], expenses: Expense[], takerId?: MemberId | null): Settlement {
  const paid: Record<MemberId, number> = {};
  const owed: Record<MemberId, number> = {};
  const bal: Record<MemberId, number> = {};
  let total = 0;
  for (const m of members) {
    paid[m.id] = 0;
    owed[m.id] = 0;
  }

  for (const e of expenses) {
    if (!isSettleable(members, e)) continue;
    const split = splitMembers(members, e);
    total += e.amount;
    paid[e.payerId] += e.amount;
    splitEven(e.amount, split.length).forEach((v, i) => {
      owed[split[i]] += v;
    });
  }
  for (const m of members) bal[m.id] = paid[m.id] - owed[m.id];

  // 덤탱이 쓸 사람 말고는 모두 유리한 쪽으로 100원 단위 정리
  const taker = resolveTaker(members, bal, takerId);
  let takerCost = 0;
  if (taker) {
    let rest = 0;
    for (const m of members) {
      if (m.id === taker) continue;
      bal[m.id] = roundInFavor(bal[m.id]);
      rest += bal[m.id];
    }
    takerCost = bal[taker] + rest;
    bal[taker] = -rest || 0;
    for (const m of members) owed[m.id] = paid[m.id] - bal[m.id];
  }

  return { paid, owed, bal, total, transfers: minTransfers(members, bal), taker, takerCost };
}

/** 최소 송금: 받을 사람·보낼 사람을 금액 큰 순으로 정렬해 greedy 매칭 (동률은 멤버 순서 유지) */
export function minTransfers(members: Member[], bal: Record<MemberId, number>): Transfer[] {
  const cred: { id: MemberId; v: number }[] = [];
  const debt: { id: MemberId; v: number }[] = [];
  for (const m of members) {
    if (bal[m.id] > 0) cred.push({ id: m.id, v: bal[m.id] });
    else if (bal[m.id] < 0) debt.push({ id: m.id, v: -bal[m.id] });
  }
  cred.sort((a, b) => b.v - a.v);
  debt.sort((a, b) => b.v - a.v);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debt.length && j < cred.length) {
    const x = Math.min(debt[i].v, cred[j].v);
    if (x > 0) transfers.push({ from: debt[i].id, to: cred[j].id, amount: x });
    debt[i].v -= x;
    cred[j].v -= x;
    if (debt[i].v === 0) i++;
    if (cred[j].v === 0) j++;
  }
  return transfers;
}
