/*
 * 음악 탭 칩. 재생목록 제목에 맞춰 2줄·줄마다 하나 (2026-10-07 사용자 확정, 실측은 private-docs 날씨-음악 investigation).
 * 검색 단위 = (시대 × 테마) 한 칸 → 5 × 13 = 65칸. 칸이 유한해야 캐시가 듣고 하루 검색 100회 안에 든다.
 */

export const ERAS = [
  { id: "all", label: "전체", q: "" },
  { id: "90", label: "90년대까지", q: "90년대" },
  { id: "00", label: "2000년대", q: "2000년대" },
  { id: "10", label: "2010년대", q: "2010년대" },
  { id: "20", label: "2020년대", q: "2020년대" },
] as const;

/** q: 재생목록 검색어. 해외 곡이 많이 섞이는 장르는 "국내" 를 붙인다 */
export const THEMES = [
  { id: "drive", group: "상황", label: "드라이브", q: "드라이브" },
  { id: "camping", group: "상황", label: "캠핑", q: "캠핑 감성" },
  { id: "trip", group: "상황", label: "여행", q: "여행 갈 때 듣는" },
  { id: "party", group: "상황", label: "신나는", q: "신나는" },
  { id: "singalong", group: "상황", label: "떼창", q: "떼창" },
  { id: "night", group: "상황", label: "새벽 감성", q: "새벽 감성" },
  { id: "ballad", group: "장르", label: "발라드", q: "발라드" },
  { id: "idol", group: "장르", label: "아이돌 댄스", q: "아이돌 댄스" },
  { id: "hiphop", group: "장르", label: "힙합", q: "국내 힙합" },
  { id: "band", group: "장르", label: "밴드", q: "밴드" },
  { id: "indie", group: "장르", label: "인디", q: "국내 인디" },
  { id: "rnb", group: "장르", label: "R&B", q: "국내 R&B" },
  { id: "trot", group: "장르", label: "트로트", q: "트로트" },
] as const;

export type EraId = (typeof ERAS)[number]["id"];
export type ThemeId = (typeof THEMES)[number]["id"];

export const ERA_IDS = ERAS.map((e) => e.id) as [EraId, ...EraId[]];
export const THEME_IDS = THEMES.map((t) => t.id) as [ThemeId, ...ThemeId[]];

/** "2010년대 드라이브 노래" / 시대 전체면 "드라이브 노래" */
export function playlistQuery(era: EraId, theme: ThemeId): string {
  const e = ERAS.find((x) => x.id === era)!;
  const t = THEMES.find((x) => x.id === theme)!;
  return [e.q, t.q, "노래"].filter(Boolean).join(" ");
}

/** music_cache 키. 거르는 규칙·검색 방식이 바뀌면 앞의 판 번호(지금 pl2)를 올려 옛 캐시를 버린다 */
export function cellKey(era: EraId, theme: ThemeId): string {
  return `pl2:${era}:${theme}`;
}

/** 한 번에 보여 줄 곡 수 */
export const PICK = 7;
