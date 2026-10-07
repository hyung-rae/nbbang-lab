import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/*
 * 서버 전용 클라이언트 (secret key). 브라우저는 DB 에 직접 접근하지 않는다 —
 * 테이블은 RLS on + anon 권한 회수 상태다 (supabase/migrations/20261006000000_init.sql 머리말).
 */
let client: SupabaseClient<Database> | null = null;

export function supabaseServer(): SupabaseClient<Database> {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY 가 없습니다. .env.example 을 참고해 .env.local 을 채워 주세요.");
  }
  client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
