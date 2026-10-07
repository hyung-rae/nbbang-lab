import { describe, expect, it } from "vitest";
import { ERA_IDS, THEME_IDS, cellKey, playlistQuery } from "./chips";
import { type VideoInfo, decodeEntities, drawSongs, durationSeconds, pickSongs, thumbUrl } from "./songs";

describe("chips", () => {
  it("검색어: 시대 + 테마 검색어 + 노래, 시대 전체면 테마만", () => {
    expect(playlistQuery("10", "drive")).toBe("2010년대 드라이브 노래");
    expect(playlistQuery("all", "indie")).toBe("국내 인디 노래");
    expect(playlistQuery("90", "ballad")).toBe("90년대 발라드 노래");
  });

  it("칸은 5 × 13 = 65개, 키는 서로 다르다", () => {
    const keys = new Set(ERA_IDS.flatMap((e) => THEME_IDS.map((t) => cellKey(e, t))));
    expect(ERA_IDS).toHaveLength(5);
    expect(THEME_IDS).toHaveLength(13);
    expect(keys.size).toBe(65);
    expect(cellKey("10", "drive")).toBe("pl2:10:drive");
  });
});

const v = (id: string, channel: string, seconds = 200, title = `곡 ${id}`): VideoInfo => ({
  id,
  title,
  channel,
  seconds,
});

describe("pickSongs", () => {
  const topic = (n: number) => Array.from({ length: n }, (_, i) => v(`t${i}`, `가수${i} - Topic`));

  it("한 곡 길이만, 가수는 Topic 을 뗀 이름", () => {
    const got = pickSongs([...topic(10), v("long", "긴 - Topic", 3600), v("short", "짧은 - Topic", 60)]);
    expect(got).toHaveLength(10);
    expect(got[0]).toEqual({ id: "t0", title: "곡 t0", artist: "가수0" });
  });

  it("공식 음원이 충분하면 일반 영상은 쓰지 않는다", () => {
    const got = pickSongs([...topic(10), v("x", "아무 채널")]);
    expect(got.map((s) => s.id)).not.toContain("x");
  });

  it("공식 음원이 모자라면 노래 같은 일반 영상으로 보충, 모음·라이브·커버는 뺀다", () => {
    const got = pickSongs([
      ...topic(2),
      v("ok", "가수 공식", 230, "가수 - 노래 (Official MV)"),
      v("mix", "모음채널", 230, "90년대 발라드 모음"),
      v("live", "방송", 230, "노래 LIVE"),
      v("cover", "누군가", 230, "노래 cover by 누군가"),
    ]);
    expect(got.map((s) => s.id)).toEqual(["t0", "t1", "ok"]);
    // 일반 영상의 채널은 올린 사람이라 가수로 쓰지 않는다
    expect(got[2].artist).toBe("");
  });

  it("공식 음원 개수는 가수 수로 센다 — 한 앨범 12곡이면 일반 영상으로 보충", () => {
    const album = Array.from({ length: 12 }, (_, i) => v(`a${i}`, i % 2 ? "가수A - Topic" : "가수B - Topic"));
    const got = pickSongs([...album, v("mv", "공식 채널", 220, "다른 가수 - 노래 (Official MV)")]);
    expect(got.map((s) => s.id)).toEqual(["a0", "a1", "mv"]);
  });

  it("가수당 1곡, 같은 영상은 한 번", () => {
    const got = pickSongs([
      v("a1", "SISTAR - Topic"),
      v("a2", "SISTAR - Topic"),
      v("a1", "SISTAR - Topic"),
      v("b1", "sistar - Topic"),
      ...topic(10),
    ]);
    expect(got.filter((s) => s.artist.toLowerCase() === "sistar")).toHaveLength(1);
    expect(new Set(got.map((s) => s.id)).size).toBe(got.length);
  });

  it("제목·가수의 HTML 엔티티를 푼다", () => {
    const got = pickSongs([v("e", "R&amp;B Star - Topic", 200, "Love &amp; Peace &#39;24"), ...topic(10)]);
    expect(got[0]).toMatchObject({ title: "Love & Peace '24", artist: "R&B Star" });
  });
});

describe("helpers", () => {
  it("thumbUrl: 영상 id 로 정해지는 썸네일 주소", () => {
    expect(thumbUrl("BD3MbtUBuTM")).toBe("https://i.ytimg.com/vi/BD3MbtUBuTM/mqdefault.jpg");
  });

  it("durationSeconds", () => {
    expect(durationSeconds("PT3M24S")).toBe(204);
    expect(durationSeconds("PT1H2M3S")).toBe(3723);
    expect(durationSeconds("PT45S")).toBe(45);
    expect(durationSeconds("P1D")).toBe(0);
  });

  it("decodeEntities: 숫자·16진 엔티티, 모르는 이름은 그대로", () => {
    expect(decodeEntities("A&#x26;B &quot;C&quot; &nbsp;")).toBe('A&B "C" &nbsp;');
    // 범위 밖 숫자는 예외 없이 원문 그대로
    expect(decodeEntities("x &#99999999; &#x110000;")).toBe("x &#99999999; &#x110000;");
  });

  it("drawSongs: n곡, 직전 곡은 되도록 뺀다", () => {
    const songs = Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, title: "", artist: "" }));
    const first = drawSongs(songs, 5, [], () => 0.3);
    expect(first).toHaveLength(5);
    const second = drawSongs(songs, 5, first.map((s) => s.id), () => 0.3);
    const overlap = second.filter((s) => first.some((f) => f.id === s.id));
    expect(overlap).toHaveLength(2); // 8곡 중 새 곡 3개 + 어쩔 수 없이 겹치는 2개
    expect(drawSongs(songs.slice(0, 3), 5)).toHaveLength(3);
  });
});
