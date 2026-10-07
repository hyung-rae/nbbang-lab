"use client";

import { Box, Button, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { Avatar, Chip, SectionTitle } from "@/components/trip/parts";
import type { Member } from "@/lib/domain/types";
import { Bomb } from "./bomb";
import { Cards } from "./cards";
import classes from "./game.module.css";
import { Ladder } from "./ladder";
import { Roulette } from "./roulette";
import { GameDesc, memberFill } from "./shared";

type Kind = "wheel" | "ladder" | "bomb" | "cards";

const GAMES: { kind: Kind; label: string; icon: React.ReactNode }[] = [
  {
    kind: "wheel",
    label: "룰렛",
    icon: (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 13V5M12 13l6.9 4M12 13l-6.9 4" />
        <path d="M10 1.5h4L12 4.5z" fill="currentColor" />
      </>
    ),
  },
  { kind: "ladder", label: "사다리", icon: <path d="M7 3v18M17 3v18M7 7h10M7 12h10M7 17h10" /> },
  {
    kind: "bomb",
    label: "폭탄",
    icon: (
      <>
        <circle cx="10" cy="14" r="7" />
        <path d="M15 9l2-2M17 7q2-3 4-2" />
      </>
    ),
  },
  {
    kind: "cards",
    label: "카드",
    icon: (
      <>
        <rect x="3" y="7" width="11" height="14" rx="2" />
        <path d="M8 3h11a2 2 0 0 1 2 2v12" />
      </>
    ),
  },
];

interface Confetti {
  left: number;
  delay: number;
  color: number;
}

/**
 * 몰빵 게임 — N빵 대신 한 명만 당첨. 저장·DB 없이 화면에서만 돈다 (탭을 떠나면 초기화).
 * 참가자·게임 종류를 바꾸면 그 판은 새로 시작한다 (round 를 key 로 게임을 다시 마운트).
 */
export function GameTab({ members, onRecordExpense }: { members: Member[]; onRecordExpense: (winnerId: string) => void }) {
  const [picked, setPicked] = useState<string[] | null>(null); // null = 전원
  const [kind, setKind] = useState<Kind>("wheel");
  // 결과는 그 판(gameKey)에 묶는다 — 다른 화면에서 멤버가 바뀌어 판이 새로 시작되면 이전 결과는 저절로 사라진다
  const [outcome, setOutcome] = useState<{ key: string; id: string } | null>(null);
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const [round, setRound] = useState(0);
  const result = useRef<HTMLDivElement>(null);

  const players = members.filter((m) => !picked || picked.includes(m.id));
  const ok = players.length >= 2;
  const gameKey = `${kind}-${round}-${players.map((p) => p.id).join(",")}`;
  const winner = outcome?.key === gameKey ? outcome.id : "";
  const winnerMember = members.find((m) => m.id === winner);

  const reset = () => {
    setOutcome(null);
    setRound((r) => r + 1);
  };

  function win(id: string) {
    setOutcome({ key: gameKey, id });
    setConfetti(
      Array.from({ length: 28 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 0.5, color: i % 6 })),
    );
    try {
      navigator.vibrate?.([60, 40, 160]);
    } catch {
      /* 진동 미지원 */
    }
  }

  useEffect(() => {
    if (winner) result.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [winner]);

  const gameProps = { players, locked: !!winner, onWin: win };

  return (
    <Stack component="section" gap="sm">
      <SectionTitle>몰빵 게임</SectionTitle>
      <Text size="sm" c="dimmed" mt={-4}>
        N빵 대신 몰빵, 한 명만 뽑아요
      </Text>

      <Box component="fieldset" m={0} p={0} style={{ border: 0 }}>
        <Text component="legend" fw={500} mb={6}>
          누가 참여하나요{" "}
          <Text span c="dimmed" inherit fw={400}>
            · {players.length}명
          </Text>
        </Text>
        <Group gap="xs">
          {members.map((m) => (
            <Chip
              key={m.id}
              type="checkbox"
              name="g-player"
              checked={players.includes(m)}
              withCheck={false}
              onChange={(on) => {
                const ids = players.map((p) => p.id);
                setPicked(on ? [...ids, m.id] : ids.filter((id) => id !== m.id));
                reset();
              }}
            >
              <Avatar member={m} size={26} />
              {m.name}
            </Chip>
          ))}
        </Group>
      </Box>

      <div role="group" aria-label="게임 고르기" className={classes.picker}>
        {GAMES.map((g) => (
          <UnstyledButton
            key={g.kind}
            aria-pressed={kind === g.kind}
            className={classes.pick}
            onClick={() => {
              setKind(g.kind);
              reset();
            }}
          >
            <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {g.icon}
            </svg>
            {g.label}
          </UnstyledButton>
        ))}
      </div>

      <Paper withBorder radius="lg" px={14} py={18}>
        <Stack align="center" gap={14}>
          {!ok ? (
            <GameDesc>두 명 이상 골라 주세요.</GameDesc>
          ) : kind === "wheel" ? (
            <Roulette key={gameKey} {...gameProps} />
          ) : kind === "ladder" ? (
            <Ladder key={gameKey} {...gameProps} />
          ) : kind === "bomb" ? (
            <Bomb key={gameKey} {...gameProps} />
          ) : (
            <Cards key={gameKey} {...gameProps} />
          )}
        </Stack>
      </Paper>

      {ok && winnerMember && (
        <Stack ref={result} role="status" align="center" gap={6} className={classes.result}>
          <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {confetti.map((c, i) => (
              <i
                key={i}
                className={classes.confetti}
                style={{ left: `${c.left.toFixed(1)}%`, background: memberFill(c.color), animationDelay: `${c.delay.toFixed(2)}s` }}
              />
            ))}
          </div>
          <Avatar member={winnerMember} size={56} />
          <Text fz={32} fw={800} lh={1.2}>
            {winnerMember.name} 당첨!
          </Text>
          <Text size="xs" c="dimmed">
            이번 계산은 {winnerMember.name} 몫이에요
          </Text>
          <Group gap="xs" justify="center" mt="xs">
            <Button variant="default" onClick={reset}>
              다시 하기
            </Button>
            <Button onClick={() => onRecordExpense(winnerMember.id)}>당첨자 몫으로 지출 기록</Button>
          </Group>
        </Stack>
      )}

      <Text size="xs" c="dimmed">
        결과는 누른 사람 화면에만 보이고 저장되지 않아요. 한 폰을 같이 보면서 하세요.
      </Text>
    </Stack>
  );
}

