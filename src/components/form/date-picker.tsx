"use client";

import { CalendarDays } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { ko } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate, parseDate, toDateString } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";

// 브라우저 기본 date input 대신 shadcn Calendar + Popover. 값은 앱 전체와 같은 "YYYY-MM-DD" 문자열로 주고받는다.

export const pickerTriggerClass =
  "flex w-full min-w-0 min-h-[46px] items-center gap-2 rounded-[10px] border border-border bg-secondary px-3 text-left outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-accent data-popup-open:border-primary";

// 폰에서 누르기 쉽게 날짜 칸 40px
const calendarClass = "[--cell-size:--spacing(10)] p-1";

const toDate = (s: string | null | undefined) => (s ? parseDate(s) : undefined);

/** 날짜 하나 고르기. trip 을 주면 여행 기간을 달력에 표시한다 */
export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "날짜 고르기",
  trip,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  trip?: { start: string | null; end: string | null };
}) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const range = trip?.start ? { from: parseDate(trip.start), to: parseDate(trip.end || trip.start) } : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger id={id} className={pickerTriggerClass}>
        <CalendarDays aria-hidden className="size-4 flex-none text-muted-foreground" />
        <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}>
          {value ? formatDate(value) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={ko}
          className={calendarClass}
          selected={selected}
          defaultMonth={selected ?? range?.from}
          modifiers={range ? { trip: range } : undefined}
          modifiersClassNames={{ trip: "[&>button]:font-bold [&>button]:text-primary" }}
          onSelect={(d) => {
            if (!d) return;
            onChange(toDateString(d));
            setOpen(false);
          }}
        />
        {range && <p className="px-3 pb-2.5 text-xs text-muted-foreground">초록 굵은 날짜가 여행 기간이에요.</p>}
      </PopoverContent>
    </Popover>
  );
}

/** 시작일~종료일 한 번에 고르기. 하루짜리 여행은 같은 날을 두 번 누른다 */
export function DateRangePicker({
  id,
  start,
  end,
  onChange,
}: {
  id?: string;
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const from = toDate(start);
  const to = toDate(end || start);
  const label = start ? (end && end !== start ? `${formatDate(start)} – ${formatDate(end)}` : formatDate(start)) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger id={id} className={pickerTriggerClass}>
        <CalendarDays aria-hidden className="size-4 flex-none text-muted-foreground" />
        <span className={cn("min-w-0 flex-1 truncate", !label && "text-muted-foreground")}>
          {label || "여행 날짜 고르기 (선택)"}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          locale={ko}
          className={calendarClass}
          selected={from ? ({ from, to } satisfies DateRange) : undefined}
          defaultMonth={from}
          onSelect={(r) => {
            const s = r?.from ? toDateString(r.from) : "";
            const e = r?.to ? toDateString(r.to) : s;
            onChange(s, e);
            if (r?.from && r?.to && r.from.getTime() !== r.to.getTime()) setOpen(false);
          }}
        />
        <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
          <span className="text-xs text-muted-foreground">시작일과 종료일을 차례로 눌러요.</span>
          <span className="flex gap-1">
            {start && (
              <button
                type="button"
                className="min-h-9 rounded-lg px-2.5 text-sm font-semibold text-muted-foreground"
                onClick={() => onChange("", "")}
              >
                지우기
              </button>
            )}
            <button
              type="button"
              className="min-h-9 rounded-lg px-2.5 text-sm font-semibold text-primary"
              onClick={() => setOpen(false)}
            >
              완료
            </button>
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
