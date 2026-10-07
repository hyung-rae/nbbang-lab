"use client";

import { Text, UnstyledButton } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { secureRandInt, shuffle } from "@/lib/domain/game";
import type { Member } from "@/lib/domain/types";
import classes from "./game.module.css";
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
      <div className={classes.cards}>
        {open.map((by, j) => {
          const hit = j === deck.prize;
          if (by) {
            return (
              <UnstyledButton
                key={j}
                disabled
                className={j === just ? `${classes.card} ${classes.flip}` : classes.card}
                data-open
                data-hit={hit || undefined}
              >
                {hit ? "당첨" : "통과"}
                <Text span size="xs" fw={600} truncate maw="100%" c="inherit">
                  {name(by)}
                </Text>
              </UnstyledButton>
            );
          }
          if (locked) {
            return (
              <UnstyledButton key={j} disabled className={classes.card}>
                통과
              </UnstyledButton>
            );
          }
          return (
            <UnstyledButton
              key={j}
              aria-label={`${j + 1}번 카드 뒤집기`}
              disabled={auto}
              onClick={() => pick(j)}
              className={classes.card}
              data-back
            >
              ?
            </UnstyledButton>
          );
        })}
      </div>
    </>
  );
}
