import type { Category } from "./categories";
import type { Expense, Member } from "./types";
import { isSettleable } from "./settle";

export interface CategoryRow {
  category: Category;
  amount: number;
  count: number;
}

export interface Rect<T> {
  item: T;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 분류별 합계 (정산에 들어가는 지출만), 금액 큰 순 */
export function categoryRows(members: Member[], expenses: Expense[]): CategoryRow[] {
  const map = new Map<Category, CategoryRow>();
  for (const e of expenses) {
    if (!isSettleable(members, e)) continue;
    const row = map.get(e.category) ?? { category: e.category, amount: 0, count: 0 };
    row.amount += e.amount;
    row.count++;
    map.set(e.category, row);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

/** squarified treemap. items 는 area 내림차순이어야 하고, area 합이 W×H 여야 한다 */
export function squarify<T extends { area: number }>(items: T[], W: number, H: number): Rect<T>[] {
  const out: Rect<T>[] = [];
  const rest = items.slice();
  let row: T[] = [];
  let x = 0;
  let y = 0;
  let w = W;
  let h = H;

  const worst = (r: T[], side: number) => {
    let s = 0;
    let mx = 0;
    let mn = Infinity;
    for (const it of r) {
      s += it.area;
      mx = Math.max(mx, it.area);
      mn = Math.min(mn, it.area);
    }
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };

  const layout = (r: T[]) => {
    const s = r.reduce((acc, it) => acc + it.area, 0);
    if (w >= h) {
      const cw = s / h;
      let cy = y;
      for (const it of r) {
        const rh = it.area / cw;
        out.push({ item: it, x, y: cy, w: cw, h: rh });
        cy += rh;
      }
      x += cw;
      w -= cw;
    } else {
      const rh = s / w;
      let cx = x;
      for (const it of r) {
        const rw = it.area / rh;
        out.push({ item: it, x: cx, y, w: rw, h: rh });
        cx += rw;
      }
      y += rh;
      h -= rh;
    }
  };

  while (rest.length) {
    const side = Math.min(w, h);
    if (!row.length || worst([...row, rest[0]], side) <= worst(row, side)) row.push(rest.shift()!);
    else {
      layout(row);
      row = [];
    }
  }
  if (row.length) layout(row);
  return out;
}

/** 아주 작은 분류도 보이도록 넓이 하한 (전체의 1.5%) */
export const TREEMAP_MIN_SHARE = 0.015;

/** 분류 행을 W×H 영역의 사각형으로 배치 */
export function layoutTreemap(rows: CategoryRow[], W: number, H: number): Rect<CategoryRow & { area: number }>[] {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  if (!total || W <= 0 || H <= 0) return [];
  const floor = total * TREEMAP_MIN_SHARE;
  const adj = rows.map((r) => Math.max(r.amount, floor));
  const adjTotal = adj.reduce((s, v) => s + v, 0);
  return squarify(
    rows.map((r, i) => ({ ...r, area: (adj[i] / adjTotal) * W * H })),
    W,
    H,
  );
}

/** 칸 크기에 따라 보여줄 글자: 이름·금액·% → 이름·% → 이름 → 없음 */
export function treemapLabelLevel(w: number, h: number): "full" | "pct" | "name" | "none" {
  if (w >= 78 && h >= 62) return "full";
  if (w >= 64 && h >= 40) return "pct";
  if (w >= 44 && h >= 26) return "name";
  return "none";
}
