"use client";

import { useEffect, useRef, useState } from "react";
import { secureRandInt, shuffle } from "@/lib/domain/game";
import type { Member } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { GameDesc } from "./shared";

/** 카드 뽑기 — 섞인 순서대로 한 장씩, 당첨 카드를 뒤집은 사람이 당첨. 마지막 한 장은 자동 */
export function Cards({ players, locked, onWin }: { players: Member[]; locked: boolean; onWin: (id: string) => void }) {
  const n = players.length;
  const [deck] = useState(() => ({ order: shuffle(players.map((m) => m.id)), prize: secureRandInt(n) }));
  const [open, setOpen] = useState<string[]>(() => players.map(() => ""));
  const [turn, setTurn] = useState(0);
  const [just, setJust] = useState(-1);
  const [auto, setAuto] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const name = (id: string) => players.find((m) => m.id === id)?.name ?? "?";

  function pick(j: number) {
    if (locked || auto || open[j]) return;
    const who = deck.order[turn];
    const nextOpen = open.map((v, k) => (k === j ? who : v));
    setOpen(nextOpen);
    setJust(j);
    if (j === deck.prize) {
      onWin(who);
      return;
    }
    const nextTurn = turn + 1;
    setTurn(nextTurn);
    const left = nextOpen.flatMap((v, k) => (v ? [] : [k]));
    if (left.length === 1) {
      // 남은 한 장은 당첨 카드라 마지막 사람에게 자동으로 넘긴다
      setAuto(true);
      timer.current = setTimeout(() => {
        const last = deck.order[nextTurn];
        setOpen((o) => o.map((v, k) => (k === left[0] ? last : v)));
        setJust(left[0]);
        onWin(last);
      }, 900);
    }
  }

  const who = deck.order[Math.min(turn, n - 1)];
  return (
    <>
      {!locked && (
        <GameDesc>
          {auto ? (
            <>
              마지막 카드는 <strong>{name(who)}</strong> 몫이에요…
            </>
          ) : (
            <>
              <strong>{name(who)}</strong> 차례예요. 카드 한 장을 골라요.
            </>
          )}
          <br />
          순서: {deck.order.map(name).join(" → ")}
        </GameDesc>
      )}
      <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(68px,1fr))] gap-2">
        {open.map((by, j) => {
          const hit = j === deck.prize;
          const base =
            "flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-xl border p-1.5 font-heading leading-tight disabled:cursor-default";
          if (by) {
            return (
              <button
                key={j}
                type="button"
                disabled
                className={cn(
                  base,
                  "text-[19px]",
                  hit ? "border-minus bg-minus text-on-danger" : "border-border bg-secondary text-foreground",
                  j === just && "animate-flip",
                )}
              >
                {hit ? "당첨" : "통과"}
                <small className="max-w-full truncate font-sans text-xs font-semibold">{name(by)}</small>
              </button>
            );
          }
          if (locked) {
            return (
              <button key={j} type="button" disabled className={cn(base, "border-border bg-secondary text-[19px] text-muted-foreground")}>
                통과
              </button>
            );
          }
          return (
            <button
              key={j}
              type="button"
              aria-label={`${j + 1}번 카드 뒤집기`}
              disabled={auto}
              onClick={() => pick(j)}
              className={cn(base, "border-primary bg-primary text-[30px] text-primary-foreground shadow-app-sm")}
            >
              ?
            </button>
          );
        })}
      </div>
    </>
  );
}
