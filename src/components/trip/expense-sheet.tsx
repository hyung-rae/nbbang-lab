"use client";

import { Alert, Box, Button, Drawer, Group, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { useEffect, useState } from "react";
import { DatePicker } from "@/components/form/date-picker";
import { OptionSelect } from "@/components/form/option-select";
import { CATEGORIES, type Category } from "@/lib/domain/categories";
import type { Expense, TripData } from "@/lib/domain/types";
import { deleteExpense, saveExpense } from "@/lib/trips/actions";
import { expenseSchema, firstError } from "@/lib/trips/schema";
import { Avatar, CategoryDot, Chip, DeleteConfirm, useAction } from "./parts";

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
  // 삭제 확인 창이 떠 있는 동안에는 시트가 Esc·바깥 누르기로 같이 닫히지 않게 (Mantine 은 열린 창마다 Esc 를 따로 듣는다)
  const [confirming, setConfirming] = useState(false);
  // 닫히는 전환 동안에도 마지막으로 연 내용(제목·폼)을 그대로 보여 준다 — props 가 바뀔 때 상태를 맞추는 렌더 중 갱신
  const [lastOpen, setLastOpen] = useState<Extract<SheetState, { open: true }> | null>(null);
  if (state.open && lastOpen !== state) setLastOpen(state);
  const view = state.open ? state : lastOpen;
  return (
    <Drawer
      opened={state.open}
      onClose={onClose}
      closeButtonProps={{ "aria-label": "닫기" }}
      closeOnEscape={!confirming}
      closeOnClickOutside={!confirming}
      position="bottom"
      size="auto"
      title={view?.expenseId ? "지출 고치기" : "지출 추가"}
      // 폰 폭 기준 가운데 36rem, 위쪽만 둥글게. 끌어내려 닫기는 없다 — 바깥 누르기·X·Esc 로 닫힌다
      styles={{
        // size="auto" 여도 아래쪽 시트가 화면 높이까지 늘어난다 → 내용 높이로
        content: {
          flex: "0 0 auto",
          height: "auto",
          // 폭은 화면을 넘지 않게: maxWidth 를 36rem 으로만 주면 Mantine 기본 max-width(100%)를 덮어써
          // 폰(393px)에서 시트가 576px 로 그려져 오른쪽(X·버튼)이 잘린다 (아이폰 실측)
          width: "100%",
          maxWidth: "min(36rem, 100%)",
          maxHeight: "92dvh",
          marginInline: "auto",
          borderRadius: "var(--mantine-radius-lg) var(--mantine-radius-lg) 0 0",
        },
        title: { fontSize: "var(--mantine-h3-font-size)", fontWeight: 700 },
      }}
    >
      {view && (
        <SheetForm
          key={view.expenseId ?? "new"}
          data={data}
          editingId={view.expenseId}
          preset={view.preset}
          defaults={defaults}
          onClose={onClose}
          onSaved={onSaved}
          onConfirmingChange={setConfirming}
          open={state.open}
        />
      )}
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
  onConfirmingChange,
  open,
}: {
  data: TripData;
  editingId: string | null;
  preset?: Partial<Pick<Expense, "title" | "category" | "split">>;
  defaults: SheetDefaults;
  onClose: () => void;
  onSaved: (date: string, payerId: string) => void;
  onConfirmingChange: (open: boolean) => void;
  /** false = 닫히는 전환 중. 방금 지운 지출이 사라졌다는 안내를 이때 띄우지 않는다 */
  open: boolean;
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
  const [confirmOpen, setConfirmOpenState] = useState(false);
  // 확인 창 문구·대상은 연 순간의 지출로 고정 — 창이 떠 있는 동안 다른 곳에서 지워져도 창이 사라지지 않고 정상적으로 닫힌다
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  // 폼이 빠지면(시트 닫힘·다른 지출로 바뀜) 바깥 시트의 "확인 중" 표시도 푼다 — 남으면 시트가 Esc 로 안 닫힌다 (코드 리뷰)
  useEffect(() => () => onConfirmingChange(false), [onConfirmingChange]);
  const setConfirmOpen = (open: boolean) => {
    setConfirmOpenState(open);
    onConfirmingChange(open);
  };
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
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Stack gap="md" pb="calc(8px + env(safe-area-inset-bottom))">
        <TextInput
          id="f-amount"
          label="금액"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          // Drawer 가 열리며 data-autofocus 칸으로 포커스를 옮긴다 (없으면 닫기 버튼)
          data-autofocus={!isEdit || undefined}
          value={amount}
          onChange={(e) => {
            const n = Number(e.currentTarget.value.replace(/\D/g, "").slice(0, 10)) || 0;
            setAmount(n ? n.toLocaleString("ko-KR") : "");
          }}
          rightSection={<Text c="dimmed">원</Text>}
          styles={{ input: { height: 54, textAlign: "right", fontSize: 26, fontWeight: 700 } }}
        />

        <TextInput
          id="f-title"
          label="내용"
          maxLength={40}
          autoComplete="off"
          placeholder="예: 흑돼지 저녁"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
        />

        <SimpleGrid cols={2} spacing="sm">
          <DatePicker id="f-date" label="날짜" value={date} onChange={setDate} trip={data.trip} />
          <OptionSelect
            id="f-category"
            label="분류"
            value={category}
            options={CATEGORIES}
            onChange={setCategory}
            icon={(c) => <CategoryDot category={c} />}
          />
        </SimpleGrid>

        <Box component="fieldset" m={0} p={0} style={{ border: 0 }}>
          <Text component="legend" fw={500} mb={6}>
            결제한 사람
          </Text>
          <Group gap="xs">
            {members.map((m) => (
              <Chip
                key={m.id}
                type="radio"
                name="f-payer"
                checked={payerId === m.id}
                withCheck={false}
                onChange={() => setPayerId(m.id)}
              >
                <Avatar member={m} size={26} />
                {m.name}
              </Chip>
            ))}
          </Group>
        </Box>

        <Box component="fieldset" m={0} p={0} style={{ border: 0 }}>
          <Text component="legend" fw={500} mb={6}>
            같이 나눌 사람
          </Text>
          <Group gap="xs">
            {members.map((m) => (
              <Chip
                key={m.id}
                type="checkbox"
                name="f-split"
                checked={split.includes(m.id)}
                withCheck={false}
                onChange={(on) => setSplit(on ? [...split, m.id] : split.filter((id) => id !== m.id))}
              >
                <Avatar member={m} size={26} />
                {m.name}
              </Chip>
            ))}
          </Group>
        </Box>

        {gone && open && (
          <Alert role="alert" color="yellow" variant="light">
            다른 곳에서 이 지출이 지워졌어요. 저장할 수 없으니 닫아 주세요.
          </Alert>
        )}
        {error && (
          <Text role="alert" size="sm" c="red" fw={500}>
            {error}
          </Text>
        )}

        {/* 고치기: [삭제하기][고치기] (닫기는 위 X) · 추가: [취소][추가] — 2026-10-07 사용자 지시 */}
        <Group gap="xs" pt={4} justify="flex-end">
          {editing && !gone ? (
            <Button
              variant="light"
              color="red"
              disabled={pending}
              onClick={() => {
                setDeleteTarget({ id: editing.id, title: editing.title });
                setConfirmOpen(true);
              }}
            >
              삭제하기
            </Button>
          ) : (
            <Button variant="default" onClick={onClose}>
              취소
            </Button>
          )}
          <Button type="submit" loading={pending} disabled={gone}>
            {isEdit ? "고치기" : "추가"}
          </Button>
        </Group>
      </Stack>

      <DeleteConfirm
        opened={confirmOpen}
        title="지출 삭제"
        loading={pending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (!deleteTarget) return;
          run(() => deleteExpense(slug, deleteTarget.id), {
            success: "지웠어요",
            onSuccess: () => {
              setConfirmOpen(false);
              onClose();
            },
            onError: (message) => {
              setConfirmOpen(false);
              setError(message);
            },
          });
        }}
      >
        <strong>{deleteTarget?.title}</strong> 지출을 지울까요? 정산에서도 빠져요.
      </DeleteConfirm>
    </form>
  );
}
