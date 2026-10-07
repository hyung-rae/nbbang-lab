"use client";

import { DatePickerInput } from "@mantine/dates";
import "dayjs/locale/ko";
import { CalendarDays } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import classes from "./date-picker.module.css";

// 브라우저 기본 date input 대신 Mantine DatePickerInput. 값은 앱 전체와 같은 "YYYY-MM-DD" 문자열로 주고받는다
// (Mantine 8+ 날짜 부품도 같은 문자열을 쓴다).

// 한국 달력 모양: 일요일 시작, "2026년 10월". 입력칸 글자는 formatDate() 와 같은 "10월 23일 (금)"
const COMMON = {
  locale: "ko",
  valueFormat: "M월 D일 (dd)",
  monthLabelFormat: "YYYY년 M월",
  firstDayOfWeek: 0,
  leftSection: <CalendarDays aria-hidden size={16} />,
  popoverProps: { position: "bottom-start" },
} as const;

/** 날짜 하나 고르기. trip 을 주면 여행 기간을 달력에 굵게 표시한다 */
export function DatePicker({
  id,
  label,
  value,
  onChange,
  placeholder = "날짜 고르기",
  trip,
}: {
  id?: string;
  label?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  trip?: { start: string | null; end: string | null };
}) {
  const from = trip?.start ?? null;
  const to = trip?.end || from;
  return (
    <DatePickerInput
      {...COMMON}
      id={id}
      label={label}
      placeholder={placeholder}
      value={value || null}
      onChange={(d) => d && onChange(d)}
      defaultDate={value || from || undefined}
      getDayProps={(d) => (from && to && d >= from && d <= to ? { className: classes.trip } : {})}
    />
  );
}

/**
 * 시작일~종료일 한 번에 고르기. 하루짜리 여행은 같은 날을 두 번 누르거나, 시작일만 누르고 닫는다.
 * 첫 날짜를 누른 "고르는 중" 상태는 여기서만 들고, 두 날짜가 정해졌을 때만 부모에 알린다 —
 * 첫 클릭에 end = start 로 올려 보내면 제어 값이 [d, d] 로 돌아와 범위 선택이 끝나 버린다(코드 리뷰: 하루짜리만 골라짐)
 */
export function DateRangePicker({
  id,
  label,
  start,
  end,
  onChange,
}: {
  id?: string;
  label?: ReactNode;
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}) {
  const [picking, setPicking] = useState<string | null>(null);
  // Mantine 은 닫힐 때 popoverProps.onClose 를 부른 "다음" 반쪽 범위를 [null, null] 로 비운다(PickerInputBase handleClose).
  // 그 비우기가 방금 저장한 하루짜리 여행을 지우지 않도록 닫히는 순간의 한 번만 무시한다
  const closing = useRef(false);
  return (
    <DatePickerInput
      {...COMMON}
      id={id}
      label={label}
      type="range"
      placeholder="여행 날짜 고르기 (선택)"
      allowSingleDateInRange
      clearable
      value={picking ? [picking, null] : [start || null, end || start || null]}
      onChange={([s, e]) => {
        if (closing.current) {
          closing.current = false;
          if (!s && !e) return;
        }
        if (s && !e) {
          setPicking(s);
          return;
        }
        setPicking(null);
        onChange(s ?? "", e ?? "");
      }}
      popoverProps={{
        ...COMMON.popoverProps,
        // 시작일만 고르고 닫으면 하루짜리 여행
        onClose: () => {
          if (picking) {
            closing.current = true;
            // 비우기는 같은 이벤트 안에서 바로 이어 온다 — 안 오면 다음 정상 변경을 막지 않게 곧 푼다
            queueMicrotask(() => (closing.current = false));
            onChange(picking, picking);
          }
          setPicking(null);
        },
      }}
    />
  );
}
