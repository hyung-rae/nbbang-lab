"use client";

import { useState } from "react";
import { DatePicker } from "@/components/form/date-picker";
import { OptionSelect } from "@/components/form/option-select";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { CATEGORIES, type Category } from "@/lib/domain/categories";
import type { Expense, TripData } from "@/lib/domain/types";
import { deleteExpense, saveExpense } from "@/lib/trips/actions";
import { expenseSchema, firstError } from "@/lib/trips/schema";
import { cn } from "@/lib/utils";
import { ArmedButton, Avatar, CategoryDot, Chip, btnGhost, btnPrimary, btnText, fieldClass, labelClass, useAction } from "./parts";

export type SheetState =
  | { open: false }
  | { open: true; expenseId: string | null; preset?: Partial<Pick<Expense, "title" | "category" | "split">> };

export interface SheetDefaults {
  date: string;
  payerId: string | null;
}

/** 지출 추가·고치기 하단 시트 (명세 입력 시트 절) */
export function ExpenseSheet({
  data,
  state,
  defaults,
  onClose,
  onSaved,
}: {
  data: TripData;
  state: SheetState;
  defaults: SheetDefaults;
  onClose: () => void;
  onSaved: (date: string, payerId: string) => void;
}) {
  return (
    <Drawer open={state.open} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto max-w-[36rem]">
        {state.open && (
          <SheetForm
            key={state.expenseId ?? "new"}
            data={data}
            editingId={state.expenseId}
            preset={state.preset}
            defaults={defaults}
            onClose={onClose}
            onSaved={onSaved}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

/*
 * 시트가 열려 있는 동안에도 다른 화면의 변경으로 data 가 새로 온다(실시간 갱신). 그래서
 * - 고치는 대상은 처음 연 id 로 고정한다 — 그 지출이 다른 곳에서 지워져도 "새 지출"로 저장되지 않게
 * - 입력값은 연 순간의 값으로 시작하고, 사용자가 건드리지 않은 "나눌 사람 = 전원"은 지금 멤버를 따라간다
 * - 그사이 빠진 멤버는 결제자·나눌 사람에서 자동으로 빠진다
 */
function SheetForm({
  data,
  editingId,
  preset,
  defaults,
  onClose,
  onSaved,
}: {
  data: TripData;
  editingId: string | null;
  preset?: Partial<Pick<Expense, "title" | "category" | "split">>;
  defaults: SheetDefaults;
  onClose: () => void;
  onSaved: (date: string, payerId: string) => void;
}) {
  const { members, slug } = data;
  const isEdit = editingId !== null;
  const editing = isEdit ? (data.expenses.find((e) => e.id === editingId) ?? null) : null;
  // 고치던 지출이 다른 곳에서 지워졌다
  const gone = isEdit && !editing;
  const [initial] = useState(() => editing);
  const fallbackPayer =
    defaults.payerId && members.some((m) => m.id === defaults.payerId) ? defaults.payerId : (members[0]?.id ?? "");
  const [amount, setAmount] = useState(initial ? initial.amount.toLocaleString("ko-KR") : "");
  const [title, setTitle] = useState(initial?.title ?? preset?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? defaults.date);
  const [category, setCategory] = useState<Category>(initial?.category ?? preset?.category ?? "식비");
  const [pickedPayer, setPayerId] = useState(initial?.payerId ?? fallbackPayer);
  // null = 아직 안 건드림 → 지금 멤버 전원
  const [pickedSplit, setSplit] = useState<string[] | null>(initial?.split ?? preset?.split ?? null);
  const [error, setError] = useState("");
  const { pending, run } = useAction();

  const memberIds = new Set(members.map((m) => m.id));
  const payerId = memberIds.has(pickedPayer) ? pickedPayer : "";
  const split = (pickedSplit ?? members.map((m) => m.id)).filter((id) => memberIds.has(id));
  const amountNumber = Number(amount.replace(/\D/g, "")) || 0;

  function submit() {
    if (gone) return;
    const input = { id: editingId, amount: amountNumber, title, date, category, payerId, split };
    const parsed = expenseSchema.safeParse(input);
    if (!parsed.success) {
      setError(firstError(parsed.error));
      return;
    }
    setError("");
    run(() => saveExpense(slug, input), {
      success: isEdit ? "고쳤어요" : "추가했어요",
      onSuccess: () => {
        onSaved(date, payerId);
        onClose();
      },
      onError: setError,
    });
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4 overflow-y-auto overscroll-contain px-4 pt-2.5 pb-[calc(16px+env(safe-area-inset-bottom))]"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div aria-hidden className="mx-auto h-1 w-10 rounded-sm bg-border" />
      <div className="flex items-center justify-between gap-2">
        <DrawerTitle className="font-heading text-2xl font-normal">{isEdit ? "지출 고치기" : "지출 추가"}</DrawerTitle>
        <button type="button" className={btnText} onClick={onClose}>
          닫기
        </button>
      </div>

      <label className="flex flex-col gap-1.5" htmlFor="f-amount">
        <span className={labelClass}>금액</span>
        <span className="relative">
          <input
            id="f-amount"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            autoFocus={!isEdit}
            value={amount}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/\D/g, "").slice(0, 10)) || 0;
              setAmount(n ? n.toLocaleString("ko-KR") : "");
            }}
            className={cn(fieldClass, "min-h-[54px] pr-10 text-right font-heading text-[26px]! tabular-nums")}
          />
          <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground">원</span>
        </span>
      </label>

      <label className="flex flex-col gap-1.5" htmlFor="f-title">
        <span className={labelClass}>내용</span>
        <input
          id="f-title"
          maxLength={40}
          autoComplete="off"
          placeholder="예: 흑돼지 저녁"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={fieldClass}
        />
      </label>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="f-date">
            날짜
          </label>
          <DatePicker id="f-date" value={date} onChange={setDate} trip={data.trip} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="f-category">
            분류
          </label>
          <OptionSelect
            id="f-category"
            value={category}
            options={CATEGORIES}
            onChange={setCategory}
            renderOption={(c) => (
              <span className="flex items-center gap-2">
                <CategoryDot category={c} />
                {c}
              </span>
            )}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className={cn(labelClass, "mb-1.5")}>결제한 사람</legend>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <Chip key={m.id} type="radio" name="f-payer" checked={payerId === m.id} onChange={() => setPayerId(m.id)}>
              <Avatar member={m} className="size-[26px] text-xs" />
              {m.name}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <legend className={labelClass}>같이 나눌 사람</legend>
          <button
            type="button"
            className={cn(btnText, "min-h-8")}
            onClick={() => setSplit(split.length === members.length ? [] : members.map((m) => m.id))}
          >
            전체 선택/해제
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <Chip
              key={m.id}
              type="checkbox"
              name="f-split"
              checked={split.includes(m.id)}
              onChange={(e) =>
                setSplit(e.target.checked ? [...split, m.id] : split.filter((id) => id !== m.id))
              }
            >
              <Avatar member={m} className="size-[26px] text-xs" />
              {m.name}
            </Chip>
          ))}
        </div>
      </fieldset>

      {gone && (
        <p role="alert" className="rounded-xl bg-sun-soft px-3.5 py-3 text-[13.5px]">
          다른 곳에서 이 지출이 지워졌어요. 저장할 수 없으니 닫아 주세요.
        </p>
      )}
      {error && (
        <p role="alert" className="text-[13px] font-medium text-minus">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {editing && !gone && (
          <ArmedButton
            armedLabel="한 번 더 누르면 삭제"
            disabled={pending}
            className={cn(btnGhost, "border-minus text-minus")}
            onConfirm={() =>
              run(() => deleteExpense(slug, editing.id), { success: "지웠어요", onSuccess: onClose, onError: setError })
            }
          >
            삭제
          </ArmedButton>
        )}
        <span className="flex-1" />
        <button type="button" className={btnGhost} onClick={onClose}>
          취소
        </button>
        <button type="submit" className={btnPrimary} disabled={pending || gone}>
          {pending ? "저장 중…" : isEdit ? "고치기" : "추가"}
        </button>
      </div>
    </form>
  );
}
