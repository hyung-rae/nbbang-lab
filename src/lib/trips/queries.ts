import "server-only";
import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import type { TripData } from "@/lib/domain/types";
import { toTripData, type TripQueryRow } from "./mapping";
import { isValidSlug } from "./slug";

// trips↔members 사이 FK 가 둘(members.trip_id, trips 덤탱이 FK)이라 임베드할 관계를 이름으로 지정한다
const TRIP_SELECT = "*, members!members_trip_id_fkey(*), expenses(*, expense_splits(member_id)), shopping_items(*)";

/** 여행 하나를 통째로 읽는다. 없거나 slug 형식이 틀리면 null. 한 요청 안(메타데이터 + 페이지)에서는 한 번만 조회 */
export const getTripBySlug = cache(async (slug: string): Promise<TripData | null> => {
  if (!isValidSlug(slug)) return null;
  const { data, error } = await supabaseServer().from("trips").select(TRIP_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? toTripData(data as unknown as TripQueryRow) : null;
});

export interface TripSummary {
  slug: string;
  name: string;
  start: string | null;
  end: string | null;
  memberCount: number;
  expenseCount: number;
  total: number;
  updatedAt: string;
}

/**
 * 여행 목록 — DB 의 모든 여행 (인증 도입 전 임시, 2026-10-06 사용자 결정).
 * 로그인이 생기면 "내가 속한 여행"으로 좁힌다. 인원·건수·합계는 DB 뷰 trip_summaries 가 여행당 한 행으로 계산한다.
 */
export async function listTrips(): Promise<TripSummary[]> {
  const { data, error } = await supabaseServer()
    .from("trip_summaries")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((t) => ({
    slug: t.slug,
    name: t.name,
    start: t.start_date,
    end: t.end_date,
    memberCount: t.member_count,
    expenseCount: t.expense_count,
    total: Number(t.total),
    updatedAt: t.updated_at,
  }));
}
