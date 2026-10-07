/** 346630 → "346,630원" */
export function won(n: number): string {
  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

/** 비율. 1% 미만은 소수 한 자리 */
export function percent(v: number, total: number): string {
  if (!total) return "0%";
  const p = (v / total) * 100;
  return `${p < 1 && p > 0 ? p.toFixed(1) : Math.round(p)}%`;
}
