import { won } from "./format";
import { splitMembers, type Settlement } from "./settle";
import type { Expense, Member } from "./types";

/** "모두 N빵" · "3명 N빵" · "혼자 부담" · "욱진 몫" · "나눌 사람 없음" */
export function splitSummary(members: Member[], e: Expense): string {
  const split = splitMembers(members, e);
  const n = split.length;
  if (n === 0) return "나눌 사람 없음";
  if (n === members.length && n > 1) return "모두 N빵";
  if (n === 1) {
    if (split[0] === e.payerId) return "혼자 부담";
    return `${members.find((m) => m.id === split[0])?.name ?? "?"} 몫`;
  }
  return `${n}명 N빵`;
}

/** "1인 86,657원" / 나누어떨어지지 않으면 "1인 약 86,657원". 1명이면 null */
export function perPersonLabel(members: Member[], e: Expense): string | null {
  const n = splitMembers(members, e).length;
  if (n < 2) return null;
  return `1인 ${e.amount % n ? "약 " : ""}${won(Math.floor(e.amount / n))}`;
}

export interface DayGroup {
  date: string;
  expenses: Expense[];
  sum: number;
}

/** 날짜별 묶음. 입력 순서(최신 날짜 → 최근 입력)를 유지한다 */
export function groupByDate(expenses: Expense[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const e of expenses) {
    let g = groups[groups.length - 1];
    if (!g || g.date !== e.date) {
      g = { date: e.date, expenses: [], sum: 0 };
      groups.push(g);
    }
    g.expenses.push(e);
    g.sum += e.amount;
  }
  return groups;
}

/** "정산 내용 복사" 텍스트 */
export function settlementText(tripName: string, members: Member[], r: Settlement): string {
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? "?";
  const lines = [`[${tripName}] 정산`, `총 지출 ${won(r.total)}`];
  if (r.taker) lines.push(`덤탱이 쓸 사람 ${name(r.taker)}${r.takerCost > 0 ? ` (끝전 +${won(r.takerCost)})` : ""}`);
  lines.push("");
  for (const t of r.transfers) lines.push(`${name(t.from)} → ${name(t.to)}  ${won(t.amount)}`);
  return lines.join("\n");
}

/** 멤버가 지출 몇 건에 들어가 있나 (결제자 또는 나눌 사람) */
export function usageCount(memberId: string, expenses: Expense[]): number {
  return expenses.filter((e) => e.payerId === memberId || e.split.includes(memberId)).length;
}
