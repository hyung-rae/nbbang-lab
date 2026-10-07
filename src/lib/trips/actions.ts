"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth/admin";
import { notifyTripChanged } from "@/lib/realtime/notify";
import { supabaseServer } from "@/lib/supabase/server";
import { geocode } from "@/lib/weather/geocode";
import {
  MAX_MEMBERS,
  MAX_SHOPPING,
  expenseSchema,
  firstError,
  newTripSchema,
  settingsSchema,
  shoppingSchema,
} from "./schema";
import { isValidSlug, newSlug } from "./slug";

/*
 * 여행 데이터 변경. Server Action 은 화면 밖에서도 POST 로 호출될 수 있으므로 모든 입력을 다시 검증하고,
 * 대상 행이 그 slug 의 여행에 속하는지 trip_id 로 한 번 더 묶는다.
 * 권한 (2026-10-07 결정): 참여자는 로그인 없이 "slug 를 안다 = 지출·장보기·덤탱이 편집 가능".
 * 새 여행·여행 삭제·설정은 관리자만 — requireAdmin() 으로 서버에서 거절한다(화면 숨김은 편의일 뿐).
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

const FAIL = "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
const NOT_FOUND = "여행을 찾을 수 없어요. 링크를 다시 확인해 주세요.";
const ADMIN_ONLY = "관리자만 할 수 있어요.";
const uuid = z.uuid();

class UserError extends Error {}

async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new UserError(ADMIN_ONLY);
}

async function tripIdOf(slug: unknown): Promise<string> {
  if (typeof slug !== "string" || !isValidSlug(slug)) throw new UserError(NOT_FOUND);
  const { data, error } = await supabaseServer().from("trips").select("id").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) throw new UserError(NOT_FOUND);
  return data.id;
}

function check<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new UserError(firstError(r.error));
  return r.data;
}

/**
 * 공통 실행: 사용자 오류는 문구 그대로, DB 오류는 코드별 문구로.
 * 성공하면 이 화면을 새로 받고(refresh), 응답을 보낸 뒤 같은 여행을 연 다른 화면에 변경 신호를 보낸다(after).
 */
async function run(
  slug: string,
  fn: () => Promise<void>,
  dbMessages: Record<string, string> = {},
): Promise<ActionResult> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    const code = (e as { code?: string })?.code;
    if (code && dbMessages[code]) return { ok: false, error: dbMessages[code] };
    console.error("[trip action]", e);
    return { ok: false, error: FAIL };
  }
  refresh();
  after(() => notifyTripChanged(slug));
  return { ok: true };
}

function throwIf(error: unknown) {
  if (error) throw error;
}

// ---------------------------------------------------------------- 여행

/** 새 여행을 만들고 그 링크로 이동한다 */
export async function createTrip(input: { name: string; start: string; end: string }): Promise<ActionResult> {
  if (!(await isAdmin())) return { ok: false, error: ADMIN_ONLY };
  const parsed = newTripSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { name, start, end } = parsed.data;

  let slug = "";
  for (let attempt = 0; attempt < 3 && !slug; attempt++) {
    const candidate = newSlug();
    const { error } = await supabaseServer()
      .from("trips")
      .insert({ slug: candidate, name, start_date: start, end_date: end });
    if (!error) slug = candidate;
    else if (error.code !== "23505") {
      console.error("[createTrip]", error);
      return { ok: false, error: FAIL };
    }
  }
  if (!slug) return { ok: false, error: FAIL };
  redirect(`/t/${slug}`);
}

/** 여행 삭제 — 멤버·지출·장보기까지 함께 지워진다(cascade). 되돌릴 수 없다 */
export async function deleteTrip(slug: string): Promise<ActionResult> {
  return run(slug, async () => {
    await requireAdmin();
    const tripId = await tripIdOf(slug);
    const { error } = await supabaseServer().from("trips").delete().eq("id", tripId);
    throwIf(error);
  });
}

/**
 * 설정 화면 한 번에 저장 — 여행 정보·멤버 빼기·색·추가를 DB 함수 하나(한 트랜잭션)로.
 * 하나라도 실패하면(지출에 든 사람 빼기·같은 이름·인원 초과) 아무것도 반영되지 않는다
 */
export async function saveSettings(slug: string, input: unknown): Promise<ActionResult> {
  return run(slug, async () => {
    await requireAdmin();
    const s = check(settingsSchema, input);
    const tripId = await tripIdOf(slug);
    const before = s.trip ? await placeOf(tripId) : null;
    const { error } = await supabaseServer().rpc("save_trip_settings", {
      p_trip_id: tripId,
      p_trip: s.trip,
      p_remove: s.remove,
      p_colors: s.colors,
      p_add: s.add,
      p_max: MAX_MEMBERS,
    });
    throwIf(error);
    if (s.trip && before) await fillCoords(tripId, s.trip.address, before);
  }, {
    "23503": "지출에 들어간 사람은 뺄 수 없어요. 그 지출을 먼저 고치거나 지워 주세요.",
    "23505": "같은 이름이 이미 있어요. 구별되게 적어 주세요.",
    NB001: `최대 ${MAX_MEMBERS}명까지 추가할 수 있어요.`,
  });
}

/** 저장 전 주소·좌표 유무. 읽지 못하면 null — 좌표 채우기만 건너뛰고 설정 저장은 막지 않는다 */
async function placeOf(tripId: string): Promise<{ address: string | null; hasCoords: boolean } | null> {
  const { data, error } = await supabaseServer().from("trips").select("address, lat, lng").eq("id", tripId).single();
  if (error) {
    console.error("[trip coords]", error);
    return null;
  }
  return { address: data.address, hasCoords: data.lat != null && data.lng != null };
}

/**
 * 숙소 좌표(날씨용)를 주소에 맞춘다 — 주소가 바뀌었거나, 주소는 있는데 좌표가 없을 때(키를 나중에 넣은 경우 등).
 * DB 함수 밖에서 저장 뒤에 따로 쓰므로, 그사이 다른 화면이 주소를 또 바꿨으면 건드리지 않는다.
 * 지오코딩·좌표 쓰기가 실패해도 설정 저장은 성공으로 둔다 (좌표가 비면 날씨 줄만 숨는다)
 */
async function fillCoords(tripId: string, address: string | null, before: { address: string | null; hasCoords: boolean }) {
  const changed = address !== before.address;
  if (!changed && (!address || before.hasCoords)) return;
  const coords = address ? await geocode(address) : null;
  if (!changed && !coords) return;
  const update = supabaseServer()
    .from("trips")
    .update({ lat: coords?.lat ?? null, lng: coords?.lng ?? null })
    .eq("id", tripId);
  const { error } = await (address === null ? update.is("address", null) : update.eq("address", address));
  if (error) console.error("[trip coords]", error);
}

/** 덤탱이 쓸 사람. null 이면 자동(가장 많이 받을 사람) */
export async function setTaker(slug: string, memberId: string | null): Promise<ActionResult> {
  return run(slug, async () => {
    const id = memberId === null ? null : check(uuid, memberId);
    const tripId = await tripIdOf(slug);
    const { error } = await supabaseServer().from("trips").update({ taker_member_id: id }).eq("id", tripId);
    throwIf(error);
  }, { "23503": "없는 멤버예요. 화면을 새로 고쳐 주세요." });
}

// 멤버 추가·빼기·색은 saveSettings 로 (설정 화면 한 번에 저장)

// ---------------------------------------------------------------- 지출

export async function saveExpense(slug: string, input: unknown): Promise<ActionResult> {
  return run(slug, async () => {
    const e = check(expenseSchema, input);
    const tripId = await tripIdOf(slug);
    const { error } = await supabaseServer().rpc("save_expense", {
      p_trip_id: tripId,
      p_expense_id: e.id,
      p_date: e.date,
      p_title: e.title,
      p_category: e.category,
      p_amount: e.amount,
      p_payer_id: e.payerId,
      p_split: [...new Set(e.split)],
    });
    throwIf(error);
  }, {
    "23503": "없는 멤버가 들어 있어요. 화면을 새로 고쳐 주세요.",
    P0002: "이미 지워진 지출이에요. 화면을 새로 고쳐 주세요.",
  });
}

export async function deleteExpense(slug: string, expenseId: string): Promise<ActionResult> {
  return run(slug, async () => {
    const id = check(uuid, expenseId);
    const tripId = await tripIdOf(slug);
    const { error } = await supabaseServer().from("expenses").delete().eq("id", id).eq("trip_id", tripId);
    throwIf(error);
  });
}

// ---------------------------------------------------------------- 장보기

export async function addShoppingItem(slug: string, input: { name: string; group: string }): Promise<ActionResult> {
  return run(slug, async () => {
    const s = check(shoppingSchema, input);
    const tripId = await tripIdOf(slug);
    const { error } = await supabaseServer().rpc("add_shopping_item", {
      p_trip_id: tripId,
      p_name: s.name,
      p_grp: s.group,
      p_max: MAX_SHOPPING,
    });
    throwIf(error);
  }, { NB002: `최대 ${MAX_SHOPPING}개까지 적을 수 있어요. 담은 것을 먼저 지워 주세요.` });
}

export async function setShoppingDone(slug: string, itemId: string, done: boolean): Promise<ActionResult> {
  return run(slug, async () => {
    const id = check(uuid, itemId);
    const tripId = await tripIdOf(slug);
    const { error } = await supabaseServer()
      .from("shopping_items")
      .update({ done: check(z.boolean(), done) })
      .eq("id", id)
      .eq("trip_id", tripId);
    throwIf(error);
  });
}

export async function deleteShoppingItem(slug: string, itemId: string): Promise<ActionResult> {
  return run(slug, async () => {
    const id = check(uuid, itemId);
    const tripId = await tripIdOf(slug);
    const { error } = await supabaseServer().from("shopping_items").delete().eq("id", id).eq("trip_id", tripId);
    throwIf(error);
  });
}
