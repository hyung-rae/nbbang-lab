"use client";

import { dayLabel, formatDate } from "@/lib/domain/dates";
import { groupByDate, perPersonLabel, splitSummary } from "@/lib/domain/expense-view";
import { won } from "@/lib/domain/format";
import type { TripData } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { CategoryDot, Empty } from "./parts";

export function ExpenseListTab({ data, onEdit }: { data: TripData; onEdit: (id: string) => void }) {
  const { members, expenses, trip } = data;
  if (!expenses.length) {
    return (
      <Empty title="아직 기록한 지출이 없어요">
        <p>
          아래 <strong>지출 추가</strong> 버튼으로 첫 지출을 적어 보세요.
        </p>
      </Empty>
    );
  }
  return (
    <>
      {groupByDate(expenses).map((g) => (
        <section key={g.date} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2 px-1">
            <h2 className="text-sm font-semibold">
              {dayLabel(trip, g.date)}
              {formatDate(g.date)}
            </h2>
            <span className="text-[13px] text-muted-foreground tabular-nums">{won(g.sum)}</span>
          </div>
          <ul className="overflow-hidden rounded-[14px] border border-border bg-card">
            {g.expenses.map((e, i) => {
              const payer = members.find((m) => m.id === e.payerId);
              const per = perPersonLabel(members, e);
              return (
                <li key={e.id} className={cn(i > 0 && "border-t border-border")}>
                  <button
                    type="button"
                    onClick={() => onEdit(e.id)}
                    aria-label={`${e.title} 고치기`}
                    className="flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-secondary"
                  >
                    <span className="inline-flex flex-none items-center gap-[5px] rounded-full border border-border bg-secondary py-[3px] pr-[9px] pl-[7px] text-[11.5px] font-medium">
                      <CategoryDot category={e.category} className="size-2" />
                      {e.category}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium">{e.title}</span>
                      <span className="text-[12.5px] text-muted-foreground">
                        {payer ? `${payer.name} 결제` : "결제자 없음"} · {splitSummary(members, e)}
                      </span>
                    </span>
                    <span className="flex flex-none flex-col items-end tabular-nums">
                      <strong>{won(e.amount)}</strong>
                      {per && <small className="text-xs text-muted-foreground">{per}</small>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
