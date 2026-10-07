"use client";

import { Box, Button, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/trip/parts";
import { LADDER_H, ladderX, ladderY, newLadder, partialPoints } from "@/lib/domain/game";
import type { Member } from "@/lib/domain/types";
import classes from "./game.module.css";
import { GameDesc, memberFill, runAnimation } from "./shared";

/** 사다리 — 이름을 눌러 타고, 당첨 칸은 도착해야 공개 */
export function Ladder({ players, locked, onWin }: { players: Member[]; locked: boolean; onWin: (id: string) => void }) {
  const n = players.length;
  const [ladder, setLadder] = useState(() => newLadder(n));
  const [started, setStarted] = useState<boolean[]>(() => players.map(() => false));
  const [arrived, setArrived] = useState<boolean[]>(() => players.map(() => false));
  // 진행률은 프레임마다 바뀌므로 상태가 아니라 ref 로 두고 polyline 을 직접 고친다.
  // 렌더에는 "출발 직후(0.001)" 또는 "도착(1)" 값만 써서, 타는 도중 다시 그려져도 React 가 points 를 덮어쓰지 않는다
  const prog = useRef<number[]>(players.map(() => 0));
  const lines = useRef<(SVGPolylineElement | null)[]>([]);
  const stops = useRef<(() => void)[]>([]);
  const won = useRef(false);
  useEffect(() => () => stops.current.forEach((s) => s()), []);

  const anyStarted = started.some(Boolean);

  function go(indexes: number[]) {
    const todo = indexes.filter((i) => !started[i]);
    if (!todo.length || locked) return;
    setStarted((s) => s.map((v, i) => v || todo.includes(i)));
    for (const i of todo) {
      prog.current[i] = 0.001;
      stops.current.push(
        runAnimation(
          1800,
          (t) => {
            prog.current[i] = Math.max(t, 0.001);
            lines.current[i]?.setAttribute("points", partialPoints(ladder.paths[i].pts, prog.current[i]));
          },
          () => {
            prog.current[i] = 1;
            setArrived((a) => a.map((v, k) => v || k === i));
            if (ladder.paths[i].end === ladder.prize && !won.current) {
              won.current = true;
              onWin(players[i].id);
            }
          },
        ),
      );
    }
  }

  return (
    <>
      {!locked && <GameDesc>자기 이름을 눌러 사다리를 타요. 당첨 칸은 도착해야 보여요.</GameDesc>}
      <Stack gap={6} w="100%">
        <Box style={{ display: "grid", gap: 4, gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {players.map((m, i) => (
            <UnstyledButton
              key={m.id}
              disabled={started[i] || locked}
              onClick={() => go([i])}
              style={started[i] ? { borderColor: memberFill(m.color), boxShadow: `inset 0 0 0 1px ${memberFill(m.color)}` } : undefined}
              className={classes.ladderName}
            >
              <Avatar member={m} size={26} />
              <Text span inherit truncate maw="100%">
                {m.name}
              </Text>
            </UnstyledButton>
          ))}
        </Box>
        <svg style={{ display: "block", width: "100%", height: 240 }} viewBox={`0 0 ${n * 60} ${LADDER_H}`} preserveAspectRatio="none" aria-hidden>
          {players.map((_, c) => (
            <line key={`v${c}`} x1={ladderX(c)} y1={0} x2={ladderX(c)} y2={LADDER_H} vectorEffect="non-scaling-stroke" style={{ stroke: "var(--mantine-color-default-border)", strokeWidth: 3 }} />
          ))}
          {ladder.rungs.map((r, k) =>
            r.map((on, j) =>
              on ? (
                <line key={`h${k}-${j}`} x1={ladderX(j)} y1={ladderY(k)} x2={ladderX(j + 1)} y2={ladderY(k)} vectorEffect="non-scaling-stroke" style={{ stroke: "var(--mantine-color-default-border)", strokeWidth: 3 }} />
              ) : null,
            ),
          )}
          {players.map((m, i) =>
            started[i] ? (
              <polyline
                key={`p${m.id}`}
                ref={(el) => {
                  lines.current[i] = el;
                }}
                points={partialPoints(ladder.paths[i].pts, arrived[i] ? 1 : 0.001)}
                vectorEffect="non-scaling-stroke"
                style={{ fill: "none", stroke: memberFill(m.color), strokeWidth: 5, strokeLinecap: "round", strokeLinejoin: "round" }}
              />
            ) : null,
          )}
        </svg>
        <Box style={{ display: "grid", gap: 4, gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {players.map((m, j) => {
            const shown = locked || ladder.paths.some((p, i) => arrived[i] && p.end === j);
            const hit = j === ladder.prize;
            return (
              <span key={m.id} className={classes.slot} data-shown={shown || undefined} data-hit={(shown && hit) || undefined}>
                {shown ? (hit ? "당첨" : "통과") : "?"}
              </span>
            );
          })}
        </Box>
      </Stack>
      {!locked && (
        <Group gap="xs" justify="center">
          <Button variant="default" onClick={() => go(players.map((_, i) => i))}>
            한 번에 모두 타기
          </Button>
          {!anyStarted && (
            <Button variant="subtle" color="gray" onClick={() => setLadder(newLadder(n))}>
              사다리 새로 만들기
            </Button>
          )}
        </Group>
      )}
    </>
  );
}
