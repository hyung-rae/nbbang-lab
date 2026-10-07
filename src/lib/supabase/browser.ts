"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
 * 브라우저용 클라이언트 (publishable key). Realtime 신호 수신에만 쓴다 — 테이블 권한은 회수돼 있어 DB 는 못 읽는다.
 * 환경변수가 없으면 null (자동 갱신만 꺼지고 앱은 동작한다).
 */
let client: SupabaseClient | null | undefined;

export function supabaseBrowser(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return client;
}
