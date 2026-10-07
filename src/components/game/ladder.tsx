"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, btnGhost, btnText } from "@/components/trip/parts";
import { LADDER_H, ladderX, ladderY, newLadder, partialPoints } from "@/lib/domain/game";
import type { Member } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
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
      <div className="flex w-full flex-col gap-1.5">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {players.map((m, i) => (
            <button
              key={m.id}
              type="button"
              disabled={started[i] || locked}
              onClick={() => go([i])}
              style={started[i] ? { borderColor: memberFill(m.color), boxShadow: `inset 0 0 0 1px ${memberFill(m.color)}` } : undefined}
              className="flex min-w-0 flex-col items-center gap-[3px] rounded-[10px] border border-border bg-secondary px-0.5 py-1.5 text-[12.5px] font-semibold disabled:cursor-default"
            >
              <Avatar member={m} className="size-[26px] text-xs" />
              <span className="max-w-full truncate">{m.name}</span>
            </button>
          ))}
        </div>
        <svg className="block h-60 w-full" viewBox={`0 0 ${n * 60} ${LADDER_H}`} preserveAspectRatio="none" aria-hidden>
          {players.map((_, c) => (
            <line key={`v${c}`} x1={ladderX(c)} y1={0} x2={ladderX(c)} y2={LADDER_H} vectorEffect="non-scaling-stroke" style={{ stroke: "var(--border)", strokeWidth: 3 }} />
          ))}
          {ladder.rungs.map((r, k) =>
            r.map((on, j) =>
              on ? (
                <line key={`h${k}-${j}`} x1={ladderX(j)} y1={ladderY(k)} x2={ladderX(j + 1)} y2={ladderY(k)} vectorEffect="non-scaling-stroke" style={{ stroke: "var(--border)", strokeWidth: 3 }} />
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
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {players.map((m, j) => {
            const shown = locked || ladder.paths.some((p, i) => arrived[i] && p.end === j);
            const hit = j === ladder.prize;
            return (
              <span
                key={m.id}
                className={cn(
                  "grid min-h-9 place-items-center rounded-lg border border-dashed border-border bg-secondary font-heading text-base text-muted-foreground",
                  shown && !hit && "border-solid text-foreground",
                  shown && hit && "border-solid border-minus bg-minus text-on-danger",
                )}
              >
                {shown ? (hit ? "당첨" : "통과") : "?"}
              </span>
            );
          })}
        </div>
      </div>
      {!locked && (
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className={btnGhost} onClick={() => go(players.map((_, i) => i))}>
            한 번에 모두 타기
          </button>
          {!anyStarted && (
            <button type="button" className={btnText} onClick={() => setLadder(newLadder(n))}>
              사다리 새로 만들기
            </button>
          )}
        </div>
      )}
    </>
  );
}
