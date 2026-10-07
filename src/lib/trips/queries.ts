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

export interface TripGate {
  id: string;
  name: string;
  /** 입장 비밀번호. null 이면 열린 여행 */
  password: string | null;
  /** 숙소 좌표 (날씨 새로고침이 같은 조회로 쓴다) */
  coords: { lat: number; lng: number } | null;
}

/**
 * 입장 판정에 필요한 것만 — 여행 id·이름·입장 비밀번호·숙소 좌표. 없거나 slug 형식이 틀리면 null.
 * 비밀번호는 서버 판정에만 쓴다(화면 데이터 TripData 에는 넣지 않는다).
 * 렌더 중(메타데이터·페이지)에는 cache() 로 요청당 한 번. Server Action 은 렌더 밖이라 부를 때마다 조회한다
 */
export const getTripGate = cache(async (slug: string): Promise<TripGate | null> => {
  if (!isValidSlug(slug)) return null;
  const { data, error } = await supabaseServer()
    .from("trips")
    .select("id, name, entry_password, lat, lng")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const coords = data.lat != null && data.lng != null ? { lat: data.lat, lng: data.lng } : null;
  return { id: data.id, name: data.name, password: data.entry_password, coords };
});

/** 주어진 여행들의 slug → 비밀번호 (여행 목록에서 입장 표를 가진 여행만 검증하는 데 쓴다). 비밀번호 없는 여행은 빠진다 */
export async function getTripPasswords(slugs: string[]): Promise<Map<string, string>> {
  if (!slugs.length) return new Map();
  const { data, error } = await supabaseServer()
    .from("trips")
    .select("slug, entry_password")
    .in("slug", slugs)
    .not("entry_password", "is", null);
  if (error) throw error;
  return new Map((data ?? []).map((t) => [t.slug, t.entry_password as string]));
}

export interface TripSummary {
  slug: string;
  name: string;
  start: string | null;
  end: string | null;
  memberCount: number;
  expenseCount: number;
  total: number;
  updatedAt: string;
  /** 입장 비밀번호가 있는 여행인지 (값은 목록에 오지 않는다) */
  hasPassword: boolean;
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
    hasPassword: t.has_password,
  }));
}
