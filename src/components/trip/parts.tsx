"use client";

import {
  ActionIcon,
  Avatar as MantineAvatar,
  Box,
  Button,
  Chip as MantineChip,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  Title,
  type MantineColor,
} from "@mantine/core";
import { Trash2 } from "lucide-react";
import { useEffect, useRef, useTransition, type ReactNode } from "react";
import { toast } from "@/components/notify";
import { categoryIndex } from "@/lib/domain/categories";
import type { Member } from "@/lib/domain/types";
import type { ActionResult } from "@/lib/trips/actions";

// 멤버 12색·지출 분류 7색 → Mantine 팔레트 색 이름. 순서가 members.color(0~11, DB check)·CATEGORIES 와 1:1 이다
// 앞 6색은 처음부터 쓰던 색이라 순서를 바꾸지 않는다 (바꾸면 기존 멤버 색이 바뀐다)
export const MEMBER_COLORS: readonly MantineColor[] = [
  "blue",
  "red",
  "violet",
  "green",
  "orange",
  "pink",
  "teal",
  "indigo",
  "lime",
  "cyan",
  "grape",
  "yellow",
];
const CATEGORY_COLORS: readonly MantineColor[] = ["orange", "yellow", "blue", "teal", "violet", "pink", "gray"];

export function memberColor(color: number): MantineColor {
  const n = MEMBER_COLORS.length;
  return MEMBER_COLORS[((color % n) + n) % n];
}

export function categoryColor(category: string): MantineColor {
  return CATEGORY_COLORS[categoryIndex(category)];
}

/** 색 이름 → 칠할 CSS 값. style prop 에 "teal.filled" 를 넘기면 SSR 이 죽는다(Mantine 9) — CSS 변수로 쓴다 */
export function filledColor(color: MantineColor): string {
  return `var(--mantine-color-${color}-filled)`;
}

/** filledColor 위에 얹을 글자색. 노랑·라임 위에서도 흰색 (2026-10-07 사용자 결정) */
export const INK_ON_FILLED = "var(--mantine-color-white)";

export function Avatar({ member, size = 30 }: { member: Member | undefined; size?: number }) {
  if (!member) return null;
  return (
    <MantineAvatar
      aria-hidden
      size={size}
      radius="xl"
      variant="filled"
      color={memberColor(member.color)}
      // 아바타 글자는 색과 상관없이 흰색 (2026-10-07 사용자 지시)
      c="white"
      styles={{ placeholder: { fontSize: Math.round(size * 0.44) } }}
    >
      {Array.from(member.name)[0] ?? "?"}
    </MantineAvatar>
  );
}

export function CategoryDot({ category, size = 10 }: { category: string; size?: number }) {
  return (
    <Box
      component="span"
      aria-hidden
      display="inline-block"
      w={size}
      h={size}
      bg={filledColor(categoryColor(category))}
      style={{ flex: "none", borderRadius: "50%" }}
    />
  );
}

/** 라디오·체크박스 칩. 선택 상태는 색 + 체크 표시로 같이 보여 준다 (명세 디자인 절). withCheck={false} 면 색으로만 */
export function Chip({
  children,
  checked,
  onChange,
  type = "checkbox",
  name,
  value,
  disabled,
  withCheck = true,
}: {
  children: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  type?: "checkbox" | "radio";
  name?: string;
  value?: string;
  disabled?: boolean;
  withCheck?: boolean;
}) {
  return (
    <MantineChip
      variant="light"
      type={type}
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      icon={withCheck ? undefined : null}
      // 아바타가 들어가도 잘리지 않게 높이는 내용에 맞춘다. Mantine 은 children 을 block span 으로 감싸므로 안쪽을 가로로 한 번 더 감싼다
      // 체크 표시가 없으면 좌우 여백을 줄이고(왼쪽 아바타는 가장자리에 붙게), 선택돼도 그대로 둬 칩 폭이 바뀌지 않게
      styles={{
        label: {
          height: "auto",
          minHeight: "var(--chip-size)",
          paddingBlock: 2,
          ...(withCheck ? null : { paddingInlineStart: 4, paddingInlineEnd: 12 }),
        },
      }}
    >
      <Group component="span" gap={6} wrap="nowrap">
        {children}
      </Group>
    </MantineChip>
  );
}

export function SectionTitle({ children, count }: { children: ReactNode; count?: ReactNode }) {
  return (
    <Group gap="xs" align="baseline">
      <Title order={2} size="h3">
        {children}
      </Title>
      {count != null && (
        <Text size="sm" c="dimmed">
          {count}
        </Text>
      )}
    </Group>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Stack
      align="center"
      gap="sm"
      px="lg"
      py={40}
      ta="center"
      c="dimmed"
      style={{ border: "1.5px dashed var(--mantine-color-default-border)", borderRadius: "var(--mantine-radius-lg)" }}
    >
      <Title order={3} size="h4" c="var(--mantine-color-text)">
        {title}
      </Title>
      {children}
    </Stack>
  );
}

/** 휴지통 아이콘 버튼. 삭제·빼기는 모두 이 버튼 → DeleteConfirm(확인 창) 으로 한다 (2026-10-07 사용자 지시) */
export function TrashButton({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <ActionIcon
      variant="subtle"
      color="red"
      size="input-sm"
      radius="md"
      aria-label={label}
      title="삭제"
      disabled={disabled}
      style={{ flex: "none" }}
      onClick={onClick}
    >
      <Trash2 aria-hidden size={18} />
    </ActionIcon>
  );
}

/**
 * 삭제 확인 창. 실수로 Enter 를 눌러도 지워지지 않게 처음 포커스는 취소에 둔다.
 * 닫히는 동안에도 문구가 남도록 부르는 쪽은 대상과 opened 를 따로 들고 있는다.
 */
export function DeleteConfirm({
  opened,
  title,
  children,
  confirmLabel = "삭제",
  loading,
  onClose,
  onConfirm,
}: {
  opened: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered radius="lg" closeButtonProps={{ "aria-label": "닫기" }}>
      <Text size="sm">{children}</Text>
      <Group justify="flex-end" gap="xs" mt="lg">
        <Button variant="default" data-autofocus onClick={onClose}>
          취소
        </Button>
        <Button color="red" loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </Group>
    </Modal>
  );
}

/** 클립보드 복사. 막힌 환경이면 false — 호출한 쪽에서 선택된 textarea 로 대신 보여 준다 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function CopyFallback({ id, text, label }: { id: string; text: string; label: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.select(), [text]);
  return (
    <Stack gap={6}>
      <Textarea ref={ref} id={id} aria-label={label} readOnly autosize minRows={4} maxRows={10} value={text} />
      <Text size="xs" c="dimmed">
        자동 복사가 안 되는 화면이라 내용을 선택해 뒀어요. 길게 눌러 복사하세요.
      </Text>
    </Stack>
  );
}

/** Server Action 실행: 실패 문구는 토스트(또는 onError), 성공 문구는 토스트 */
export function useAction() {
  const [pending, startTransition] = useTransition();
  function run(
    fn: () => Promise<ActionResult>,
    opts: { success?: string; onSuccess?: () => void; onError?: (message: string) => void } = {},
  ) {
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        if (opts.success) toast(opts.success);
        opts.onSuccess?.();
      } else if (opts.onError) opts.onError(r.error);
      else toast.error(r.error);
    });
  }
  return { pending, run };
}
