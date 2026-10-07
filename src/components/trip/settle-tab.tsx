"use client";

import { useState } from "react";
import { toast } from "sonner";
import { settlementText } from "@/lib/domain/expense-view";
import { won } from "@/lib/domain/format";
import type { Settlement } from "@/lib/domain/settle";
import type { CategoryRow } from "@/lib/domain/treemap";
import type { Member, TripData } from "@/lib/domain/types";
import { setTaker } from "@/lib/trips/actions";
import { cn } from "@/lib/utils";
import { Avatar, Chip, CopyFallback, SectionTitle, btnGhost, copyText, useAction } from "./parts";
import { Treemap } from "./treemap";

const list = "overflow-hidden rounded-[14px] border border-border bg-card";

export function SettleTab({
  data,
  result,
  categories,
}: {
  data: TripData;
  result: Settlement;
  categories: CategoryRow[];
}) {
  const { members } = data;
  const byId = (id: string) => members.find((m) => m.id === id);
  const [fallback, setFallback] = useState("");

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <SectionTitle>송금 정리</SectionTitle>
        {result.transfers.length ? (
          <>
            <p className="-mt-1 text-[13px] text-muted-foreground">이대로 보내면 정산이 끝나요.</p>
            <TakerCard data={data} result={result} />
            <ol className={list}>
              {result.transfers.map((t, i) => (
                <li
                  key={`${t.from}-${t.to}`}
                  className={cn(
                    "grid grid-cols-[minmax(0,1fr)_1.2em_minmax(0,1fr)_7.2em] items-center gap-2 px-3.5 py-3",
                    i > 0 && "border-t border-border",
                  )}
                >
                  <Who member={byId(t.from)} />
                  <span className="text-center text-muted-foreground" aria-label="에게">
                    →
                  </span>
                  <Who member={byId(t.to)} />
                  <strong className="text-right font-semibold whitespace-nowrap tabular-nums">{won(t.amount)}</strong>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnGhost}
                onClick={async () => {
                  const text = settlementText(data.trip.name, members, result);
                  if (await copyText(text)) {
                    setFallback("");
                    toast("정산 내용을 복사했어요");
                  } else setFallback(text);
                }}
              >
                정산 내용 복사
              </button>
            </div>
            {fallback && <CopyFallback id="settle-copy" text={fallback} label="복사할 정산 내용" />}
          </>
        ) : (
          <p className={cn(list, "p-3.5 text-sm text-muted-foreground")}>
            {result.total ? "모두 딱 맞게 냈어요. 보낼 돈이 없어요." : "아직 기록한 지출이 없어요."}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>사람별</SectionTitle>
        <p className="-mt-1 text-[13px] text-muted-foreground">
          낸 돈은 직접 결제한 금액, 쓴 돈은 N빵으로 나눈 내 몫이에요. 100원 단위로 정리하고 남는 끝전은 덤탱이 쓸 사람
          몫이에요.
        </p>
        <ul className={list}>
          {members.map((m, i) => {
            const b = result.bal[m.id];
            return (
              <li key={m.id} className={cn("flex items-center gap-3 px-3.5 py-3", i > 0 && "border-t border-border")}>
                <Avatar member={m} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">{m.name}</span>
                  <span className="text-[12.5px] text-muted-foreground tabular-nums">
                    낸 돈 {won(result.paid[m.id])} · 쓴 돈 {won(result.owed[m.id])}
                  </span>
                </div>
                <div
                  className={cn(
                    "flex flex-none flex-col items-end text-right",
                    b > 0 ? "text-plus" : b < 0 ? "text-minus" : "text-muted-foreground",
                  )}
                >
                  <strong className="tabular-nums">
                    {b > 0 ? "+" : b < 0 ? "−" : ""}
                    {won(Math.abs(b))}
                  </strong>
                  <span className="text-xs">{b > 0 ? "받을 돈" : b < 0 ? "보낼 돈" : "정산 끝"}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>어디에 썼나</SectionTitle>
        {categories.length ? (
          <>
            <p className="-mt-1 text-[13px] text-muted-foreground">
              넓이가 쓴 돈에 비례해요. 칸이나 목록을 누르면 그 분류만 볼 수 있어요.
            </p>
            <Treemap rows={categories} total={result.total} />
          </>
        ) : (
          <p className={cn(list, "p-3.5 text-sm text-muted-foreground")}>
            지출을 기록하면 분류별로 얼마나 썼는지 보여요.
          </p>
        )}
      </section>
    </>
  );
}

function Who({ member }: { member: Member | undefined }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar member={member} />
      <span className="truncate font-semibold">{member?.name ?? "?"}</span>
    </span>
  );
}

function TakerCard({ data, result }: { data: TripData; result: Settlement }) {
  const { pending, run } = useAction();
  if (!result.taker) return null;
  const explicit = data.takerId !== null && data.members.some((m) => m.id === data.takerId);
  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-card p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-semibold">덤탱이 쓸 사람</h3>
        {result.takerCost > 0 && (
          <span className="text-[13px] font-semibold whitespace-nowrap text-minus tabular-nums">
            끝전 +{won(result.takerCost)}
          </span>
        )}
      </div>
      <p className="text-[12.5px] text-muted-foreground">
        송금은 100원 단위로 끊고, 남는 끝전은 이 사람이 몰아서 내요.
        {!explicit && " 정하지 않으면 가장 많이 받을 사람이 써요."}
      </p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="덤탱이 쓸 사람">
        {data.members.map((m) => (
          <Chip
            key={m.id}
            type="radio"
            name="taker"
            value={m.id}
            checked={m.id === result.taker}
            disabled={pending}
            onChange={() => run(() => setTaker(data.slug, m.id), { success: `덤탱이는 ${m.name}` })}
          >
            <Avatar member={m} className="size-[26px] text-xs" />
            {m.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}
