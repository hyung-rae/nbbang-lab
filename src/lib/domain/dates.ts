import type { Trip } from "./types";

const DAY_MS = 86_400_000;
const WEEKDAYS = "일월화수목금토";

/** YYYY-MM-DD → 로컬 자정 Date */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Date → 로컬 기준 YYYY-MM-DD */
export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / DAY_MS);
}

/** "10월 23일 (금)" */
export function formatDate(s: string): string {
  const d = parseDate(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

export function weekday(s: string): string {
  return WEEKDAYS[parseDate(s).getDay()];
}

/** 여행 전 `D-N` / 여행 중 `N일차` / 끝나면 `여행 끝`. 시작일이 없으면 빈 문자열 */
export function tripBadge(trip: Pick<Trip, "start" | "end">, today: string): string {
  if (!trip.start) return "";
  const end = trip.end || trip.start;
  const until = daysBetween(today, trip.start);
  if (until > 0) return `D-${until}`;
  if (today <= end) return `${daysBetween(trip.start, today) + 1}일차`;
  return "여행 끝";
}

/** 여행 기간 안의 날짜면 "N일차 · " 접두어 */
export function dayLabel(trip: Pick<Trip, "start" | "end">, date: string): string {
  if (trip.start && date >= trip.start && (!trip.end || date <= trip.end)) {
    return `${daysBetween(trip.start, date) + 1}일차 · `;
  }
  return "";
}

/** "10월 23일 (금) – 10월 25일 (일) · 2박 3일" */
export function tripDateRange(trip: Pick<Trip, "start" | "end">): string {
  if (!trip.start) return "";
  const end = trip.end || trip.start;
  const nights = Math.max(0, daysBetween(trip.start, end));
  return `${formatDate(trip.start)}${end !== trip.start ? ` – ${formatDate(end)}` : ""} · ${nights}박 ${nights + 1}일`;
}

/** 새 지출 기본 날짜: 마지막 입력 날짜 → 오늘 (여행 기간 밖이면 시작일/종료일) */
export function defaultExpenseDate(trip: Pick<Trip, "start" | "end">, today: string, lastDate?: string): string {
  if (lastDate) return lastDate;
  if (trip.start && today < trip.start) return trip.start;
  if (trip.end && today > trip.end) return trip.end;
  return today;
}

/** 특정 시간대 기준 오늘 (YYYY-MM-DD). 서버(Vercel)는 UTC 라 한국 자정 전후로 하루 어긋나지 않게 쓴다 */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
