"use server";

import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { ERA_IDS, THEME_IDS, cellKey, playlistQuery } from "./chips";
import type { Song } from "./songs";
import { LimitError, searchSongs } from "./youtube";

const DAY_MS = 86_400_000;
/** 이 기간 안의 캐시는 그대로 쓴다 */
const FRESH_MS = 7 * DAY_MS;
/** YouTube 정책(III.E.4): 인증 없는 API 데이터는 30일 넘게 두지 않는다 — 실패해도 이보다 오래된 값은 쓰지 않는다 */
const MAX_AGE_MS = 30 * DAY_MS;

export type SongsResult = { ok: true; songs: Song[] } | { ok: false; error: string };

/** 실패(오류·빈 결과)는 캐시에 남지 않는다 — 그 칸은 이만큼 다시 검색하지 않아 검색 한도가 새지 않게 */
const RETRY_AFTER_MS = 10 * 60_000;
const failedAt = new Map<string, number>();
/** 같은 칸을 동시에 처음 부르면(친구 여럿이 같은 칩) YouTube 는 한 번만 */
const inflight = new Map<string, Promise<Song[]>>();
// 둘 다 서버 인스턴스 메모리라 인스턴스끼리는 나누지 않는다 — 완전한 막음이 아니라 줄이는 장치

const RETRY_LATER = "노래를 찾지 못했어요. 잠시 뒤 다시 해 주세요.";

const input = z.object({ era: z.enum(ERA_IDS), theme: z.enum(THEME_IDS) });

// 예전 캐시 행에 남은 필드(thumb 등)는 버린다
const songsSchema = z.array(z.object({ id: z.string(), title: z.string(), artist: z.string() }));

/**
 * 음악 탭 — (시대, 테마) 한 칸의 노래 후보. 7곡(PICK) 뽑기·다시 뽑기는 화면에서 한다(재호출 없음).
 * 칩 값만 받으므로 칸은 65개뿐이고, 성공한 칸은 7일 동안 YouTube 를 다시 부르지 않는다. 실패한 칸은 10분 쉬고,
 * 같은 칸 동시 요청은 하나로 묶는다(인스턴스 안에서). 인증 전이라 누구나 부를 수 있어 이것들이 검색 한도 방어다.
 */
export async function getSongs(raw: unknown): Promise<SongsResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "고를 수 없는 조건이에요." };
  const { era, theme } = parsed.data;
  const key = cellKey(era, theme);
  const db = supabaseServer();

  const { data: row, error: readError } = await db.from("music_cache").select("videos, fetched_at").eq("key", key).maybeSingle();
  if (readError) {
    // 캐시를 못 읽는데 YouTube 로 가면 요청마다 검색 한도를 쓴다
    console.error("[music cache]", readError);
    return { ok: false, error: RETRY_LATER };
  }
  const age = row ? Date.now() - Date.parse(row.fetched_at) : Infinity;
  const cached = row && age < MAX_AGE_MS ? songsSchema.safeParse(row.videos) : null;
  if (cached?.success && age < FRESH_MS) return { ok: true, songs: cached.data };

  const apiKey = process.env.YOUTUBE_API_KEY;
  const stale = cached?.success ? cached.data : null;
  if (!apiKey) {
    return stale ? { ok: true, songs: stale } : { ok: false, error: "음악 기능을 준비하고 있어요." };
  }

  if (Date.now() - (failedAt.get(key) ?? 0) < RETRY_AFTER_MS) {
    return stale ? { ok: true, songs: stale } : { ok: false, error: RETRY_LATER };
  }

  try {
    let pending = inflight.get(key);
    if (!pending) {
      pending = searchSongs(playlistQuery(era, theme), apiKey).finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }
    const songs = await pending;
    if (!songs.length) {
      // 빈 결과는 캐시하지 않는다 (일시적인 검색 결과일 수 있어 7일 동안 굳히지 않게)
      failedAt.set(key, Date.now());
      return { ok: true, songs: stale ?? [] };
    }
    failedAt.delete(key);
    const { error } = await db.from("music_cache").upsert({ key, videos: songs, fetched_at: new Date().toISOString() });
    if (error) console.error("[music cache]", error);
    return { ok: true, songs };
  } catch (e) {
    failedAt.set(key, Date.now());
    const limit = e instanceof LimitError ? e : null;
    if (!limit) console.error("[music]", e);
    if (stale) return { ok: true, songs: stale };
    return {
      ok: false,
      error: limit?.daily
        ? "오늘은 새 노래 찾기를 다 썼어요. 다른 조건을 고르거나 내일 다시 해 주세요."
        : RETRY_LATER,
    };
  }
}
