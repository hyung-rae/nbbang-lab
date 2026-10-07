"use client";

import { Button, Stack, Text, UnstyledButton } from "@mantine/core";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { GameTab } from "@/components/game/game-tab";
import { PageShell } from "@/components/page-shell";
import { defaultExpenseDate } from "@/lib/domain/dates";
import { settle } from "@/lib/domain/settle";
import { categoryRows } from "@/lib/domain/treemap";
import type { TripData } from "@/lib/domain/types";
import { ExpenseListTab } from "./expense-list-tab";
import { ExpenseSheet, type SheetState } from "./expense-sheet";
import { Empty } from "./parts";
import { SettingsTab } from "./settings-tab";
import { SettleTab } from "./settle-tab";
import { ShopTab } from "./shop-tab";
import { Ticket } from "./ticket";
import classes from "./trip-app.module.css";
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
        <Text size="sm">설정에서 친구들을 먼저 추가해 주세요.</Text>
        <Button onClick={goSettings}>친구 추가하러 가기</Button>
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
      <PageShell pb="calc(170px + env(safe-area-inset-bottom))" gap={22}>
        <AppHeader />
        <Ticket data={data} today={today} total={result.total} />
        <Stack role="tabpanel" gap={36}>
          {body}
        </Stack>
      </PageShell>

      <nav aria-label="화면 이동" className={classes.nav}>
        <div className={classes.inner}>
          {showFab && (
            <Button
              className={classes.fab}
              leftSection={<Plus aria-hidden size={16} />}
              onClick={() => setSheet({ open: true, expenseId: null })}
            >
              지출 추가
            </Button>
          )}
          <div role="tablist" className={classes.tabs}>
            {TABS.map(([id, label]) => (
              <UnstyledButton
                key={id}
                role="tab"
                aria-selected={tab === id}
                className={classes.tab}
                onClick={() => {
                  setTab(id);
                  window.scrollTo(0, 0);
                }}
              >
                {label}
              </UnstyledButton>
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
