"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/trip/parts";
import { bombFuseMs, secureRandInt } from "@/lib/domain/game";
import type { Member } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { GameDesc, goButton } from "./shared";

function star(r1: number, r2: number) {
  const p: string[] = [];
  for (let k = 0; k < 24; k++) {
    const r = k % 2 ? r2 : r1;
    const a = (k * 15 * Math.PI) / 180;
    p.push(`${(60 + r * Math.sin(a)).toFixed(1)},${(60 - r * Math.cos(a)).toFixed(1)}`);
  }
  return p.join(" ");
}
const BOOM_OUTER = star(58, 36);
const BOOM_INNER = star(40, 24);

function BombSvg({ state }: { state: "idle" | "live" | "boom" }) {
  if (state === "boom") {
    return (
      <svg className="block size-[150px] animate-boom" viewBox="0 0 120 120" aria-hidden>
        <polygon points={BOOM_OUTER} style={{ fill: "var(--minus)" }} />
        <polygon points={BOOM_INNER} style={{ fill: "var(--sun)" }} />
        <text x="60" y="61" textAnchor="middle" dominantBaseline="central" fontSize="26" style={{ fill: "var(--sun-ink)", fontFamily: "var(--font-display)" }}>
          펑!
        </text>
      </svg>
    );
  }
  return (
    <svg className={cn("block size-[150px]", state === "live" && "animate-wobble")} viewBox="0 0 120 120" aria-hidden>
      <path d="M84 30Q96 12 106 18" style={{ fill: "none", stroke: "var(--muted-foreground)", strokeWidth: 3, strokeLinecap: "round" }} />
      <rect x="70" y="30" width="18" height="14" rx="3" transform="rotate(45 79 37)" style={{ fill: "var(--muted-foreground)" }} />
      <circle cx="52" cy="72" r="40" style={{ fill: "var(--bomb)" }} />
      <circle cx="38" cy="58" r="8" style={{ fill: "#FFFFFF", opacity: 0.3 }} />
      {state === "live" && <circle className="animate-spark" cx="106" cy="18" r="8" style={{ fill: "var(--sun)" }} />}
    </svg>
  );
}

/** 폭탄 돌리기 — 든 사람이 버튼을 누르고 폰을 넘긴다. 7~18초 중 아무 때나 터짐 */
export function Bomb({ players, locked, onWin }: { players: Member[]; locked: boolean; onWin: (id: string) => void }) {
  const [state, setState] = useState<"idle" | "live" | "boom">("idle");
  const [holder, setHolder] = useState(0);
  const [passes, setPasses] = useState(0);
  // 터지는 순간의 들고 있는 사람은 타이머 콜백에서 읽으므로 ref 로도 들고 있는다
  const holderRef = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const n = players.length;

  function start() {
    if (n < 2 || locked) return;
    const h = secureRandInt(n);
    holderRef.current = h;
    setHolder(h);
    setPasses(0);
    setState("live");
    timer.current = setTimeout(() => {
      setState("boom");
      onWin(players[holderRef.current].id);
    }, bombFuseMs());
  }

  function pass() {
    const h = (holderRef.current + 1) % n;
    holderRef.current = h;
    setHolder(h);
    setPasses((p) => p + 1);
  }

  if (state === "idle") {
    return (
      <>
        <BombSvg state="idle" />
        <GameDesc>
          시작하면 폭탄이 아무에게나 가요. 폭탄을 든 사람이 버튼을 누르고 <strong>폰을 다음 사람에게 넘겨요</strong>. 언제 터질지는 아무도 몰라요.
        </GameDesc>
        <button type="button" className={goButton} disabled={locked} onClick={start}>
          폭탄 시작
        </button>
      </>
    );
  }
  const cur = players[holder];
  if (state === "boom") {
    return (
      <>
        <BombSvg state="boom" />
        <GameDesc>
          <strong>{cur.name}</strong> 손에서 터졌어요! ({passes}번 넘김)
        </GameDesc>
      </>
    );
  }
  const next = players[(holder + 1) % n];
  return (
    <>
      <BombSvg state="live" />
      <div className="flex items-center gap-2.5 text-[17px]">
        <Avatar member={cur} className="size-10 text-[17px]" />
        <span>
          <strong>{cur.name}</strong> 손에 폭탄이 있어요
        </span>
      </div>
      <button type="button" className={goButton} onClick={pass}>
        {next.name}에게 넘기기 →
      </button>
      <GameDesc>째깍째깍… {passes}번 넘김</GameDesc>
    </>
  );
}
