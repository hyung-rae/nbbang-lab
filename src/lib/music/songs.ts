/** 음악 탭 곡 한 줄 (YouTube 영상). music_cache.videos(jsonb)에 그대로 들어가도록 interface 가 아닌 type */
export type Song = {
  id: string;
  title: string;
  artist: string;
};

/** 영상 썸네일(320×180). 주소가 영상 id 로 정해져 있어 저장하지 않고 화면에서 만든다 */
export function thumbUrl(id: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg`;
}

/** videos.list 에서 거르기에 필요한 것만 */
export interface VideoInfo {
  id: string;
  title: string;
  channel: string;
  /** 길이(초) */
  seconds: number;
}

const MIN_SECONDS = 90;
const MAX_SECONDS = 8 * 60;
/** 공식 음원 가수가 이보다 적으면 일반 영상으로 보충한다 (90년대처럼 공식 음원 채널에 적게 올라온 시대) */
const MIN_OFFICIAL = 10;
const TOPIC = / - Topic$/;
// 노래 한 곡이 아닌 영상(모음·라이브·커버·노래방 등) — 일반 영상으로 보충할 때만 쓴다
const NOT_A_SONG =
  /모음|플레이리스트|playlist|연속|1시간|시간\s*듣기|라이브|\blive\b|cover|커버|노래방|\bmr\b|\binst\b|리믹스|remix|\bmix\b|메들리|compilation|reaction|리액션|직캠|shorts/i;

/** ISO 8601 길이(PT3M24S) → 초 */
export function durationSeconds(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" };

/** API 가 주는 제목의 HTML 엔티티만 푼다 — 검색 결과 내용은 고치지 않는다 (YouTube 정책 III.C.5) */
export function decodeEntities(s: string): string {
  return s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (all, e: string) => {
    if (ENTITIES[e]) return ENTITIES[e];
    const code = e.startsWith("#x") ? parseInt(e.slice(2), 16) : e.startsWith("#") ? Number(e.slice(1)) : NaN;
    // 범위 밖 숫자는 fromCodePoint 가 예외를 던진다 — 원문 그대로 둔다
    return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : all;
  });
}

/**
 * 재생목록 영상들 → 노래 후보. 한 곡 길이(1분30초~8분)만, 공식 음원(`… - Topic`) 우선,
 * 모자라면 노래 같은 일반 영상으로 보충(가수 칸은 비움), 가수(채널)당 1곡, 같은 영상은 한 번만. 순서는 재생목록 순서 그대로
 */
export function pickSongs(videos: VideoInfo[]): Song[] {
  const fit = videos.filter((v) => v.seconds >= MIN_SECONDS && v.seconds <= MAX_SECONDS);
  const official = fit.filter((v) => TOPIC.test(v.channel));
  // 가수당 1곡으로 줄기 전 개수가 아니라 가수 수로 본다 (한 앨범 12곡 = 2곡이 될 수 있다)
  const officialArtists = new Set(official.map((v) => v.channel.toLowerCase())).size;
  const pool =
    officialArtists >= MIN_OFFICIAL
      ? official
      : [...official, ...fit.filter((v) => !TOPIC.test(v.channel) && !NOT_A_SONG.test(v.title))];

  const seenIds = new Set<string>();
  const seenArtists = new Set<string>();
  const out: Song[] = [];
  for (const v of pool) {
    const official = TOPIC.test(v.channel);
    const key = v.channel.replace(TOPIC, "").trim().toLowerCase();
    if (seenIds.has(v.id) || seenArtists.has(key)) continue;
    seenIds.add(v.id);
    seenArtists.add(key);
    // 공식 음원 채널 이름 = 가수. 일반 영상의 채널은 올린 사람이라 가수로 쓰지 않는다(제목에 가수가 들어 있다)
    const artist = official ? decodeEntities(v.channel.replace(TOPIC, "").trim()) : "";
    out.push({ id: v.id, title: decodeEntities(v.title), artist });
  }
  return out;
}

/** 후보에서 n곡 무작위. 직전에 보여 준 곡은 되도록 빼고 (후보가 모자라면 다시 섞어 넣는다) */
export function drawSongs(candidates: Song[], n: number, previous: string[] = [], random = Math.random): Song[] {
  const shuffle = (a: Song[]) => {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };
  const prev = new Set(previous);
  const fresh = shuffle(candidates.filter((s) => !prev.has(s.id)));
  const again = shuffle(candidates.filter((s) => prev.has(s.id)));
  return [...fresh, ...again].slice(0, n);
}
