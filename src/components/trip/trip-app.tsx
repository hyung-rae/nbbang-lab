"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { GameTab } from "@/components/game/game-tab";
import { defaultExpenseDate } from "@/lib/domain/dates";
import { settle } from "@/lib/domain/settle";
import { categoryRows } from "@/lib/domain/treemap";
import type { TripData } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { ExpenseListTab } from "./expense-list-tab";
import { ExpenseSheet, type SheetState } from "./expense-sheet";
import { Empty, btnPrimary } from "./parts";
import { SettingsTab } from "./settings-tab";
import { SettleTab } from "./settle-tab";
import { ShopTab } from "./shop-tab";
import { Ticket, UpdatedAt } from "./ticket";
import { useLiveUpdates } from "./use-live-updates";

const TABS = [
  ["settle", "정산"],
  ["list", "지출 내역"],
  ["shop", "장보기"],
  ["game", "게임"],
  ["settings", "설정"],
] as const;
type Tab = (typeof TABS)[number][0];

/** 여행 화면 전체. 데이터는 서버가 내려 주고, 바뀌면 Server Action 의 refresh() 로 새 props 가 온다 */
export function TripApp({ data, today }: { data: TripData; today: string }) {
  const [tab, setTab] = useState<Tab>("settle");
  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const [last, setLast] = useState<{ date?: string; payerId: string | null }>({ payerId: null });

  const result = useMemo(() => settle(data.members, data.expenses, data.takerId), [data]);
  const categories = useMemo(() => categoryRows(data.members, data.expenses), [data]);

  useLiveUpdates(data.slug);

  const noMembers = data.members.length === 0;
  const goSettings = () => {
    setTab("settings");
    window.scrollTo(0, 0);
  };

  let body: React.ReactNode;
  if (tab === "settings") body = <SettingsTab data={data} />;
  else if (tab === "shop")
    body = (
      <ShopTab
        data={data}
        onRecordExpense={() => setSheet({ open: true, expenseId: null, preset: { title: "장보기", category: "식비" } })}
      />
    );
  else if (noMembers)
    body = (
      <Empty title="함께 가는 사람이 아직 없어요">
        <p>설정에서 친구들을 먼저 추가해 주세요.</p>
        <button type="button" className={btnPrimary} onClick={goSettings}>
          친구 추가하러 가기
        </button>
      </Empty>
    );
  else if (tab === "game")
    body = (
      <GameTab
        members={data.members}
        onRecordExpense={(winnerId) => setSheet({ open: true, expenseId: null, preset: { split: [winnerId] } })}
      />
    );
  else if (tab === "list")
    body = <ExpenseListTab data={data} onEdit={(id) => setSheet({ open: true, expenseId: id })} />;
  else body = <SettleTab data={data} result={result} categories={categories} />;

  const showFab = !noMembers && (tab === "settle" || tab === "list");

  return (
    <>
      <div className="mx-auto flex w-full max-w-[36rem] flex-col gap-[22px] px-4 pt-3 pb-[calc(170px+env(safe-area-inset-bottom))]">
        <AppHeader />
        <Ticket data={data} today={today} total={result.total} />
        <UpdatedAt iso={data.updatedAt} />
        <div role="tabpanel" className="flex flex-col gap-9">
          {body}
        </div>
      </div>

      <nav
        aria-label="화면 이동"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
      >
        <div className="relative mx-auto max-w-[36rem] px-3">
          {showFab && (
            <button
              type="button"
              onClick={() => setSheet({ open: true, expenseId: null })}
              className="absolute right-3 bottom-[calc(100%+14px)] inline-flex min-h-[52px] items-center gap-1.5 rounded-full bg-primary pr-5 pl-4 text-[15px] font-semibold text-primary-foreground shadow-app"
            >
              <b aria-hidden className="text-[22px] leading-none font-medium">
                +
              </b>
              지출 추가
            </button>
          )}
          <div role="tablist" className="flex h-[62px]">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => {
                  setTab(id);
                  window.scrollTo(0, 0);
                }}
                className={cn(
                  "relative min-w-0 flex-1 text-[clamp(12.5px,3.5vw,15px)] font-semibold whitespace-nowrap text-muted-foreground",
                  "aria-selected:text-accent-foreground aria-selected:before:absolute aria-selected:before:inset-x-[32%] aria-selected:before:top-0 aria-selected:before:h-[3px] aria-selected:before:rounded-b-[3px] aria-selected:before:bg-primary aria-selected:before:content-['']",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <ExpenseSheet
        data={data}
        state={sheet}
        defaults={{ date: defaultExpenseDate(data.trip, today, last.date), payerId: last.payerId }}
        onClose={() => setSheet({ open: false })}
        onSaved={(date, payerId) => setLast({ date, payerId })}
      />
    </>
  );
}
