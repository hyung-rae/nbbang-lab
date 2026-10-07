"use client";

import { useEffect, useRef, useState } from "react";
import { easeOutQuart, secureRandInt, wheelTargetAngle } from "@/lib/domain/game";
import type { Member } from "@/lib/domain/types";
import { inkOn, memberColor } from "@/components/trip/parts";
import { GameDesc, GoButton, memberFill, runAnimation } from "./shared";

const R = 92;
const C = 100;

function pt(deg: number, r: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [C + r * Math.sin(rad), C - r * Math.cos(rad)];
}

/** 룰렛 — 멤버 색 칸, 4.6초 감속 후 바늘 위 칸 당첨 */
export function Roulette({ players, locked, onWin }: { players: Member[]; locked: boolean; onWin: (id: string) => void }) {
  const [spinning, setSpinning] = useState(false);
  // 멈춰 있을 때 각도는 상태로 그리고, 도는 동안은 프레임마다 <g> 의 transform 을 직접 고친다.
  // React 는 바뀐 속성만 DOM 에 쓰므로 도는 중 다시 그려져도(다른 화면 변경 신호 등) 회전이 튀지 않는다
  const [rest, setRest] = useState(0);
  const angle = useRef(0);
  const g = useRef<SVGGElement>(null);
  const stop = useRef<() => void>(undefined);
  useEffect(() => () => stop.current?.(), []);

  const n = players.length;
  const s = 360 / n;
  const fs = n <= 4 ? 17 : n <= 6 ? 14 : 11;

  function spin() {
    if (spinning || locked || n < 2) return;
    const w = secureRandInt(n);
    const from = angle.current;
    const to = wheelTargetAngle(n, w, from, Math.random() - 0.5);
    setSpinning(true);
    stop.current = runAnimation(
      4600,
      (t) => {
        angle.current = from + (to - from) * easeOutQuart(t);
        g.current?.setAttribute("transform", `rotate(${angle.current.toFixed(2)} 100 100)`);
      },
      () => {
        angle.current = to % 360;
        setRest(angle.current);
        setSpinning(false);
        onWin(players[w].id);
      },
    );
  }

  return (
    <>
      <GameDesc>버튼을 누르면 룰렛이 돌아가요. 화살표가 멈춘 칸이 당첨!</GameDesc>
      <svg style={{ display: "block", width: "min(100%, 300px)", height: "auto" }} viewBox="0 0 200 200" role="img" aria-label="참가자 룰렛">
        <circle cx="100" cy="100" r="96" style={{ fill: "var(--mantine-color-default-hover)", stroke: "var(--mantine-color-default-border)", strokeWidth: 2 }} />
        <g ref={g} transform={`rotate(${rest.toFixed(2)} 100 100)`}>
          {players.map((m, i) => {
            const a0 = i * s;
            const a1 = (i + 1) * s;
            const ci = a0 + s / 2;
            const p0 = pt(a0, R);
            const p1 = pt(a1, R);
            const tp = pt(ci, R * 0.6);
            const rot = ci > 180 ? ci + 90 : ci - 90;
            return (
              <g key={m.id}>
                <path
                  d={`M${C} ${C}L${p0[0].toFixed(2)} ${p0[1].toFixed(2)}A${R} ${R} 0 ${s > 180 ? 1 : 0} 1 ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}Z`}
                  style={{ fill: memberFill(m.color), stroke: "var(--mantine-color-body)", strokeWidth: 1.5 }}
                />
                <text
                  x={tp[0].toFixed(2)}
                  y={tp[1].toFixed(2)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={fs}
                  transform={`rotate(${rot.toFixed(2)} ${tp[0].toFixed(2)} ${tp[1].toFixed(2)})`}
                  style={{ fill: inkOn(memberColor(m.color)), fontWeight: 700 }}
                >
                  {Array.from(m.name).slice(0, 5).join("")}
                </text>
              </g>
            );
          })}
        </g>
        <circle cx="100" cy="100" r="13" style={{ fill: "var(--mantine-color-body)", stroke: "var(--mantine-color-default-border)", strokeWidth: 2 }} />
        <path
          d="M88 1h24l-12 24z"
          style={{ fill: "var(--mantine-color-text)", stroke: "var(--mantine-color-body)", strokeWidth: 2, strokeLinejoin: "round" }}
        />
      </svg>
      <GoButton disabled={spinning || locked} onClick={spin}>
        {spinning ? "돌아가는 중…" : "돌리기"}
      </GoButton>
    </>
  );
}
