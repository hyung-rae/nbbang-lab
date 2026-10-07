import { isCategory, toShopGroup } from "@/lib/domain/categories";
import type { Forecast, TripData } from "@/lib/domain/types";
import type { ExpenseRow, Json, MemberRow, ShoppingItemRow, TripRow } from "@/lib/supabase/database.types";

/** getTripBySlug 의 중첩 select 결과 한 행 */
export type TripQueryRow = TripRow & {
  members: MemberRow[];
  expenses: (ExpenseRow & { expense_splits: { member_id: string }[] })[];
  shopping_items: ShoppingItemRow[];
};

function toForecast(v: Json | null): Forecast | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const f = v as Partial<Forecast>;
  if (typeof f.addr !== "string" || typeof f.at !== "string" || !Array.isArray(f.days)) return null;
  return { addr: f.addr, at: f.at, src: typeof f.src === "string" ? f.src : "", days: f.days };
}

/** DB 행 → 화면용 도메인 데이터. 정렬을 여기서 확정한다 */
export function toTripData(row: TripQueryRow): TripData {
  const members = [...row.members]
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
    .map((m) => ({ id: m.id, name: m.name, color: m.color }));

  const expenses = [...row.expenses]
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
    .map((e) => ({
      id: e.id,
      date: e.date,
      title: e.title,
      category: isCategory(e.category) ? e.category : ("기타" as const),
      amount: e.amount,
      payerId: e.payer_id,
      split: e.expense_splits.map((s) => s.member_id),
    }));

  const shopping = [...row.shopping_items]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((s) => ({ id: s.id, name: s.name, group: toShopGroup(s.grp), done: s.done }));

  return {
    id: row.id,
    slug: row.slug,
    trip: { name: row.name, start: row.start_date, end: row.end_date, address: row.address },
    members,
    expenses,
    shopping,
    takerId: row.taker_member_id,
    forecast: toForecast(row.forecast),
    updatedAt: row.updated_at,
  };
}
