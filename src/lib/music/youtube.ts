import { z } from "zod";
import { type Song, type VideoInfo, durationSeconds, pickSongs } from "./songs";

// YouTube Data API v3. 키는 서버 전용(YOUTUBE_API_KEY)
const API = "https://www.googleapis.com/youtube/v3";
const TIMEOUT_MS = 5000;
/** 검색한 재생목록 중 곡을 꺼낼 개수. 칸 하나 = search 1회(하루 100회 버킷) + 재생목록마다 2단위(1만 단위 버킷) */
const PLAYLISTS = 3;

/** YouTube 한도 — daily: 하루 한도(search.list 100회)를 다 씀, 아니면 짧은 시간 요청이 몰려 잠시 막힘 */
export class LimitError extends Error {
  constructor(readonly daily: boolean) {
    super(daily ? "daily quota" : "rate limit");
  }
}

const SearchResponse = z.object({
  items: z.array(z.object({ id: z.object({ playlistId: z.string().optional() }) })),
});
const PlaylistItemsResponse = z.object({
  items: z.array(z.object({ contentDetails: z.object({ videoId: z.string() }) })),
});
const VideosResponse = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      snippet: z.object({
        title: z.string(),
        channelTitle: z.string(),
      }),
      contentDetails: z.object({ duration: z.string() }),
    }),
  ),
});

async function call(path: string, params: Record<string, string>, key: string): Promise<unknown> {
  const url = new URL(`${API}/${path}`);
  url.search = new URLSearchParams({ ...params, key }).toString();
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const reason = (json as { error?: { errors?: { reason?: string }[] } } | null)?.error?.errors?.[0]?.reason;
    if (res.status === 403 && (reason === "quotaExceeded" || reason === "dailyLimitExceeded")) throw new LimitError(true);
    if (res.status === 429 || reason === "rateLimitExceeded" || reason === "userRateLimitExceeded") throw new LimitError(false);
    throw new Error(`[youtube] ${path} ${res.status} ${reason ?? ""}`);
  }
  return json;
}

/** 재생목록 검색어 → 노래 후보. 키가 없으면 호출 전에 실패 */
export async function searchSongs(query: string, key: string): Promise<Song[]> {
  const search = SearchResponse.parse(
    await call(
      "search",
      { part: "snippet", q: query, type: "playlist", maxResults: "5", regionCode: "KR", relevanceLanguage: "ko" },
      key,
    ),
  );
  const playlistIds = search.items.flatMap((i) => (i.id.playlistId ? [i.id.playlistId] : [])).slice(0, PLAYLISTS);

  // 재생목록마다 곡 id → 길이·채널. 순서를 지켜 이어 붙인다(앞 재생목록이 검색어에 더 맞다).
  // 비공개·삭제된 재생목록 하나가 실패해도 나머지로 간다 — 전부 실패했을 때만 오류
  const perPlaylist = await Promise.allSettled(
    playlistIds.map(async (playlistId): Promise<VideoInfo[]> => {
      const items = PlaylistItemsResponse.parse(
        await call("playlistItems", { part: "contentDetails", playlistId, maxResults: "50" }, key),
      );
      const ids = items.items.map((i) => i.contentDetails.videoId);
      if (!ids.length) return [];
      const videos = VideosResponse.parse(await call("videos", { part: "contentDetails,snippet", id: ids.join(",") }, key));
      return videos.items.map((v) => ({
        id: v.id,
        title: v.snippet.title,
        channel: v.snippet.channelTitle,
        seconds: durationSeconds(v.contentDetails.duration),
      }));
    }),
  );
  const ok = perPlaylist.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (playlistIds.length && !ok.length) throw (perPlaylist[0] as PromiseRejectedResult).reason;
  return pickSongs(ok.flat());
}
