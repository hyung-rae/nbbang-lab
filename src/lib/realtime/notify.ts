import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { TRIP_CHANGED, tripTopic } from "./topic";

/** 다른 화면에 "이 여행이 바뀌었어요" 신호. 실패해도 저장은 이미 끝났으므로 기록만 남긴다 */
export async function notifyTripChanged(slug: string): Promise<void> {
  const db = supabaseServer();
  const channel = db.channel(tripTopic(slug));
  try {
    const r = await channel.httpSend(TRIP_CHANGED, {});
    if (!r.success) console.error("[notifyTripChanged]", r.status, r.error);
  } catch (e) {
    console.error("[notifyTripChanged]", e);
  } finally {
    await db.removeChannel(channel);
  }
}
