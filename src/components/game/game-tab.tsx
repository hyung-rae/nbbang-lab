"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, Chip, SectionTitle, btnGhost, btnPrimary, labelClass } from "@/components/trip/parts";
import { MISSIONS, josa, type Mission } from "@/lib/domain/game";
import type { Member } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Bomb } from "./bomb";
import { Cards } from "./cards";
import { Ladder } from "./ladder";
import { Roulette } from "./roulette";
import { memberFill } from "./shared";

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
  const [mission, setMission] = useState<Mission>(MISSIONS[0]);
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
    <section className="flex flex-col gap-2.5">
      <SectionTitle>몰빵 게임</SectionTitle>
      <p className="-mt-1 text-[13px] text-muted-foreground">N빵 대신 딱 한 명만 당첨! 링크만 있으면 누구나 눌러서 할 수 있어요.</p>

      <fieldset className="flex flex-col gap-1.5">
        <legend className={cn(labelClass, "mb-1.5")}>무엇을 걸까요</legend>
        <div className="flex flex-wrap gap-2">
          {MISSIONS.map((x) => (
            <Chip key={x} type="radio" name="g-mission" checked={mission === x} onChange={() => setMission(x)} className="px-3.5">
              {x}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className={cn(labelClass, "mb-1.5")}>
          누가 참여하나요 <span className="font-normal">· {players.length}명</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <Chip
              key={m.id}
              type="checkbox"
              name="g-player"
              checked={players.includes(m)}
              onChange={(e) => {
                const ids = players.map((p) => p.id);
                setPicked(e.target.checked ? [...ids, m.id] : ids.filter((id) => id !== m.id));
                reset();
              }}
            >
              <Avatar member={m} className="size-[26px] text-xs" />
              {m.name}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div role="group" aria-label="게임 고르기" className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-secondary p-1">
        {GAMES.map((g) => (
          <button
            key={g.kind}
            type="button"
            aria-pressed={kind === g.kind}
            onClick={() => {
              setKind(g.kind);
              reset();
            }}
            className="flex min-h-[58px] flex-col items-center justify-center gap-[3px] rounded-[9px] px-0.5 py-1.5 text-[13.5px] font-semibold text-muted-foreground aria-pressed:bg-card aria-pressed:text-accent-foreground aria-pressed:shadow-app-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[22px]">
              {g.icon}
            </svg>
            {g.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3.5 rounded-[14px] border border-border bg-card px-3.5 py-[18px]">
        {!ok ? (
          <p className="text-center text-[13.5px] text-muted-foreground">두 명 이상 골라 주세요.</p>
        ) : kind === "wheel" ? (
          <Roulette key={gameKey} {...gameProps} />
        ) : kind === "ladder" ? (
          <Ladder key={gameKey} {...gameProps} />
        ) : kind === "bomb" ? (
          <Bomb key={gameKey} {...gameProps} />
        ) : (
          <Cards key={gameKey} {...gameProps} />
        )}
      </div>

      {ok && winnerMember && (
        <div
          ref={result}
          role="status"
          className="relative flex scroll-mb-[150px] flex-col items-center gap-1.5 overflow-hidden rounded-[14px] bg-sun-soft px-4 pt-6 pb-4 text-center"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {confetti.map((c, i) => (
              <i
                key={i}
                className="absolute -top-3.5 h-3 w-[7px] animate-fall rounded-[2px]"
                style={{ left: `${c.left.toFixed(1)}%`, background: memberFill(c.color), animationDelay: `${c.delay.toFixed(2)}s` }}
              />
            ))}
          </div>
          <Avatar member={winnerMember} className="size-14 text-2xl" />
          <p className="font-heading text-[32px] leading-tight">{winnerMember.name} 당첨!</p>
          <p className="text-[12.5px] text-muted-foreground">
            {josa(mission, "은", "는")} {winnerMember.name} 몫이에요
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button type="button" className={btnGhost} onClick={reset}>
              다시 하기
            </button>
            {mission === "이번 계산" && (
              <button type="button" className={btnPrimary} onClick={() => onRecordExpense(winnerMember.id)}>
                당첨자 몫으로 지출 기록
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-[12.5px] text-muted-foreground">결과는 누른 사람 화면에만 보이고 저장되지 않아요. 한 폰을 같이 보면서 하세요.</p>
    </section>
  );
}
