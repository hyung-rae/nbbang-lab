"use client";

import { Box, Button, Group, Paper, Skeleton, Stack, Text, VisuallyHidden } from "@mantine/core";
import { Disc3, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import list from "@/components/list.module.css";
import { Chip, Empty, SectionTitle } from "@/components/trip/parts";
import { ERAS, type EraId, PICK, THEMES, type ThemeId } from "@/lib/music/chips";
import { getSongs, type SongsResult } from "@/lib/music/actions";
import { type Song, drawSongs, thumbUrl } from "@/lib/music/songs";
import classes from "./music.module.css";

/** 칩을 눌러도 최소 이만큼은 "고르는 중" — 캐시가 바로 와도 바뀐 것을 알아보게 (명세 음악 탭 절) */
const MIN_LOADING_MS = 700;

type View =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; candidates: Song[]; shown: Song[] };

const THEME_GROUPS = ["상황", "장르"] as const;

/** 탭을 열면 골라 두고 바로 불러오는 칸 (2026-10-07 사용자 지시) */
const DEFAULT_ERA: EraId = "00";
const DEFAULT_THEME: ThemeId = "idol";

/** 음악 탭 — 시대·테마를 고르면 YouTube 재생목록에서 국내 노래 7곡(PICK). 저장 없이 이 화면에서만 (친구 화면과 공유 안 함) */
export function MusicTab() {
  const [era, setEra] = useState<EraId>(DEFAULT_ERA);
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  // 처음부터 기본 칸을 불러오는 중으로 시작한다(아래 effect)
  const [view, setView] = useState<View>({ kind: "loading" });
  // 연달아 누르면 마지막 조건의 결과만 보여 준다
  const request = useRef(0);

  const fetchSongs = useCallback(async (nextEra: EraId, nextTheme: ThemeId) => {
    const id = ++request.current;
    const [res] = await Promise.all([
      getSongs({ era: nextEra, theme: nextTheme }).catch(
        (): SongsResult => ({ ok: false, error: "노래를 찾지 못했어요. 잠시 뒤 다시 해 주세요." }),
      ),
      new Promise((r) => setTimeout(r, MIN_LOADING_MS)),
    ]);
    if (id !== request.current) return;
    setView(
      res.ok
        ? { kind: "done", candidates: res.songs, shown: drawSongs(res.songs, PICK) }
        : { kind: "error", message: res.error },
    );
  }, []);

  const load = (nextEra: EraId, nextTheme: ThemeId) => {
    setView({ kind: "loading" });
    fetchSongs(nextEra, nextTheme);
  };

  useEffect(() => {
    fetchSongs(DEFAULT_ERA, DEFAULT_THEME);
  }, [fetchSongs]);

  const pickEra = (next: EraId) => {
    setEra(next);
    load(next, theme);
  };
  const pickTheme = (next: ThemeId) => {
    setTheme(next);
    load(era, next);
  };
  const redraw = () => {
    if (view.kind !== "done") return;
    setView({ ...view, shown: drawSongs(view.candidates, PICK, view.shown.map((s) => s.id)) });
  };

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Group gap={8} align="center" wrap="nowrap">
          <SectionTitle>여행 플레이리스트</SectionTitle>
          {/* YouTube 에서 찾은 곡이라는 출처 표시 (YouTube 정책 III.F.2.a) */}
          <Image src="/brands/youtube.png" alt="YouTube" width={26} height={26} />
        </Group>
        <Text size="sm" c="dimmed">
          시대와 테마를 고르면 YouTube 재생목록에서 국내 노래를 {PICK}곡씩 골라 드려요.
        </Text>
      </Stack>

      <Box component="fieldset" className={classes.fieldset}>
        <VisuallyHidden component="legend">시대</VisuallyHidden>
        <Group gap={8}>
          {ERAS.map((e) => (
            <Chip
              key={e.id}
              type="radio"
              name="music-era"
              value={e.id}
              checked={era === e.id}
              onChange={() => pickEra(e.id)}
            >
              {e.label}
            </Chip>
          ))}
        </Group>
      </Box>

      <Box component="fieldset" className={classes.fieldset}>
        <VisuallyHidden component="legend">테마</VisuallyHidden>
        {/* 상황 줄·장르 줄을 나눠 보이되 제목은 달지 않는다 (사용자 결정) */}
        <Stack gap={8}>
          {THEME_GROUPS.map((g) => (
            <Group key={g} gap={8}>
              {THEMES.filter((t) => t.group === g).map((t) => (
                <Chip
                  key={t.id}
                  type="radio"
                  name="music-theme"
                  value={t.id}
                  checked={theme === t.id}
                  onChange={() => pickTheme(t.id)}
                >
                  {t.label}
                </Chip>
              ))}
            </Group>
          ))}
        </Stack>
      </Box>

      <Result view={view} onRedraw={redraw} showEraHint={era !== "all"} />
    </Stack>
  );
}

function Result({ view, onRedraw, showEraHint }: { view: View; onRedraw: () => void; showEraHint: boolean }) {
  if (view.kind === "loading")
    return (
      <Stack gap="xs" aria-busy>
        <Group gap={7} c="dimmed" role="status">
          <Disc3 aria-hidden size={18} className={classes.spin} />
          <Text size="sm">노래 고르는 중…</Text>
        </Group>
        <Paper withBorder radius="lg" component="ul" className={list.list} aria-hidden>
          {Array.from({ length: PICK }, (_, i) => (
            <Group component="li" key={i} gap="sm" px={14} py={12} wrap="nowrap">
              <Skeleton width={64} height={36} radius="sm" />
              <Skeleton height={12} width="65%" />
            </Group>
          ))}
        </Paper>
      </Stack>
    );

  if (view.kind === "error")
    return (
      <Empty title="노래를 찾지 못했어요">
        <Text size="sm">{view.message}</Text>
      </Empty>
    );

  if (!view.shown.length)
    return (
      <Empty title="맞는 노래가 없어요">
        <Text size="sm">{showEraHint ? "시대를 '전체'로 바꿔 보세요." : "다른 테마를 골라 보세요."}</Text>
      </Empty>
    );

  return (
    <Stack gap="sm">
      <Paper withBorder radius="lg" className={list.list}>
        {/* 다시 뽑기는 카드 안 오른쪽 위 (사용자 결정) */}
        <Group justify="flex-end" px={10} pt={8}>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<RefreshCw aria-hidden size={14} />}
            onClick={onRedraw}
            disabled={view.candidates.length <= PICK}
          >
            다시 뽑기
          </Button>
        </Group>
        <ul className={list.list} aria-live="polite">
          {view.shown.map((s) => (
            <Group component="li" key={s.id} gap="sm" px={14} py={12} wrap="nowrap">
              {/* 누르는 곳은 없다 (2026-10-07 사용자 결정). 썸네일은 i.ytimg.com 에서 브라우저가 바로 받는다(unoptimized — Vercel 이미지 최적화 한도 안 씀) */}
              <Image src={thumbUrl(s.id)} alt="" width={64} height={36} unoptimized className={classes.thumb} />
              <Text component="span" lh={1.4} miw={0}>
                <Text component="span" fw={600}>
                  {s.title}
                </Text>
                {s.artist && (
                  <Text component="span" size="sm" c="dimmed">
                    {" · "}
                    {s.artist}
                  </Text>
                )}
              </Text>
            </Group>
          ))}
        </ul>
      </Paper>

      {view.shown.length < PICK && (
        <Text size="sm" c="dimmed">
          맞는 노래가 {view.shown.length}곡뿐이에요.{showEraHint && " 시대를 '전체'로 바꾸면 더 나와요."}
        </Text>
      )}

      <Text size="xs" c="dimmed">
        YouTube 재생목록에서 찾은 곡이에요. 시대는 대략이에요.
      </Text>
    </Stack>
  );
}
