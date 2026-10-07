"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ArmedButton, Empty, btnText, useAction } from "@/components/trip/parts";
import { formatDate } from "@/lib/domain/dates";
import { won } from "@/lib/domain/format";
import { deleteTrip } from "@/lib/trips/actions";
import type { TripSummary } from "@/lib/trips/queries";
import { cn } from "@/lib/utils";

function dateText(t: TripSummary) {
  if (!t.start) return "날짜 미정";
  return t.end && t.end !== t.start ? `${formatDate(t.start)} – ${formatDate(t.end)}` : formatDate(t.start);
}

/** 여행을 눌러 들어가고, 두 번 눌러 삭제 */
export function TripList({ trips }: { trips: TripSummary[] }) {
  const { pending, run } = useAction();
  if (!trips.length) {
    return (
      <Empty title="아직 만든 여행이 없어요">
        <p>
          <strong>+ 새 여행</strong>으로 첫 여행을 만들어 보세요.
        </p>
      </Empty>
    );
  }
  return (
    <ul className="overflow-hidden rounded-[14px] border border-border bg-card">
      {trips.map((t, i) => (
        <li key={t.slug} className={cn("flex items-center gap-1 pr-2", i > 0 && "border-t border-border")}>
          <Link href={`/t/${t.slug}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3.5 hover:bg-secondary">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold">{t.name}</span>
              <span className="text-[12.5px] text-muted-foreground">{dateText(t)}</span>
              <span className="text-[12.5px] text-muted-foreground tabular-nums">
                {t.memberCount}명 · 지출 {t.expenseCount}건 · {won(t.total)}
              </span>
            </span>
            <ChevronRight aria-hidden className="size-4 flex-none text-muted-foreground" />
          </Link>
          {/* 폭을 고정해 "정말 삭제"로 바뀌거나 3초 뒤 되돌아갈 때 옆 링크가 손가락 밑으로 밀려오지 않게 한다 */}
          <ArmedButton
            armedLabel="정말 삭제"
            disabled={pending}
            aria-label={`${t.name} 삭제`}
            className={cn(btnText, "w-[5.5em] flex-none text-center text-minus")}
            onConfirm={() => run(() => deleteTrip(t.slug), { success: `'${t.name}' 여행을 지웠어요` })}
          >
            삭제
          </ArmedButton>
        </li>
      ))}
    </ul>
  );
}
