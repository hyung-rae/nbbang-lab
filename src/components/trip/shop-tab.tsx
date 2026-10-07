"use client";

import { Button, Checkbox, Group, Paper, Progress, Stack, Text, TextInput, Title } from "@mantine/core";
import { useOptimistic, useState, useTransition } from "react";
import { OptionSelect } from "@/components/form/option-select";
import classes from "@/components/list.module.css";
import { toast } from "@/components/notify";
import { SHOP_GROUPS, type ShopGroup } from "@/lib/domain/categories";
import type { ShoppingItem, TripData } from "@/lib/domain/types";
import { addShoppingItem, clearDoneShopping, deleteShoppingItem, setShoppingDone } from "@/lib/trips/actions";
import { shoppingSchema, firstError } from "@/lib/trips/schema";
import { DeleteConfirm, Empty, SectionTitle, TrashButton, useAction } from "./parts";
import shop from "./shop-tab.module.css";

export function ShopTab({ data, onRecordExpense }: { data: TripData; onRecordExpense: () => void }) {
  const { slug } = data;
  // 체크는 바로 반영해 보이고(낙관적), 서버 응답이 오면 실제 값으로 맞춘다
  const [items, setOptimistic] = useOptimistic(data.shopping, (list: ShoppingItem[], u: { id: string; done: boolean }) =>
    list.map((x) => (x.id === u.id ? { ...x, done: u.done } : x)),
  );
  const [, startToggle] = useTransition();
  const [name, setName] = useState("");
  const [group, setGroup] = useState<ShopGroup>("고기");
  const [error, setError] = useState("");
  const { pending, run } = useAction();
  // 무엇을 지울지(항목 하나 / 담은 것 전부). 닫히는 동안에도 문구가 남게 열림과 따로 둔다
  const [target, setTarget] = useState<{ item: ShoppingItem } | "done" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const ask = (t: { item: ShoppingItem } | "done") => {
    setTarget(t);
    setConfirmOpen(true);
  };

  const done = items.filter((x) => x.done).length;

  function toggle(id: string, next: boolean) {
    startToggle(async () => {
      setOptimistic({ id, done: next });
      const r = await setShoppingDone(slug, id, next);
      if (!r.ok) toast.error(r.error);
    });
  }

  function add() {
    const parsed = shoppingSchema.safeParse({ name, group });
    if (!parsed.success) {
      setError(firstError(parsed.error));
      return;
    }
    setError("");
    run(() => addShoppingItem(slug, { name, group }), {
      onSuccess: () => {
        setName("");
        document.getElementById("s-name")?.focus();
      },
      onError: setError,
    });
  }

  return (
    <Stack component="section" gap="sm">
      <SectionTitle count={items.length ? `${items.length}개` : undefined}>장볼 것</SectionTitle>
      {items.length > 0 && (
        <Group gap={10} wrap="nowrap">
          <Progress aria-hidden flex={1} size="sm" radius="xl" value={(done / items.length) * 100} />
          <Text size="sm" c="dimmed">
            {done} / {items.length} 담음
          </Text>
        </Group>
      )}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <OptionSelect id="s-group" aria-label="분류" value={group} options={SHOP_GROUPS} onChange={setGroup} className={shop.group} />
          <TextInput
            id="s-name"
            aria-label="살 것"
            flex={1}
            miw={0}
            maxLength={30}
            autoComplete="off"
            placeholder="살 것 (예: 삼겹살)"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <Button type="submit" loading={pending} style={{ flex: "none" }}>
            추가
          </Button>
        </Group>
      </form>
      {error && (
        <Text size="sm" c="red" fw={500} role="alert">
          {error}
        </Text>
      )}

      {!items.length ? (
        <Empty title="아직 장볼 목록이 없어요">
          <Text size="sm">위에서 살 것을 하나씩 추가해 보세요.</Text>
        </Empty>
      ) : (
        <Stack gap={18}>
          {SHOP_GROUPS.map((g) => {
            const list = items.filter((x) => x.group === g);
            if (!list.length) return null;
            const gd = list.filter((x) => x.done).length;
            // 분류 안에서는 안 담은 것 먼저
            const sorted = [...list.filter((x) => !x.done), ...list.filter((x) => x.done)];
            return (
              <Stack component="section" key={g} gap="xs">
                <Group justify="space-between" align="baseline" gap="xs" px={4}>
                  <Title order={3} size="h6" c={gd === list.length ? "dimmed" : undefined}>
                    {g}
                  </Title>
                  <Text size="sm" c="dimmed">
                    {gd} / {list.length}
                  </Text>
                </Group>
                <Paper component="ul" withBorder radius="lg" className={classes.list}>
                  {sorted.map((x) => (
                    <Group component="li" key={x.id} className={classes.row} gap={4} pr={6} wrap="nowrap">
                      <Checkbox
                        radius="xl"
                        flex={1}
                        miw={0}
                        py="sm"
                        pl={14}
                        checked={x.done}
                        onChange={(e) => toggle(x.id, e.currentTarget.checked)}
                        label={x.name}
                        styles={{
                          body: { alignItems: "center" },
                          labelWrapper: { flex: 1, minWidth: 0 },
                          label: x.done ? { color: "var(--mantine-color-dimmed)", textDecoration: "line-through" } : undefined,
                        }}
                      />
                      <TrashButton
                        label={`${x.name} 지우기`}
                        disabled={pending}
                        onClick={() => ask({ item: x })}
                      />
                    </Group>
                  ))}
                </Paper>
              </Stack>
            );
          })}
        </Stack>
      )}

      {items.length > 0 && (
        <Group gap="xs">
          {done > 0 && (
            <Button variant="default" disabled={pending} onClick={() => ask("done")}>
              담은 것 지우기
            </Button>
          )}
          {data.members.length > 0 && (
            <Button variant="default" onClick={onRecordExpense}>
              장본 금액 지출로 기록
            </Button>
          )}
        </Group>
      )}
      <DeleteConfirm
        opened={confirmOpen}
        title={target === "done" ? "담은 것 지우기" : "장볼 것 삭제"}
        loading={pending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (!target) return;
          const close = () => setConfirmOpen(false);
          if (target === "done") run(() => clearDoneShopping(slug), { success: "담은 것을 지웠어요", onSuccess: close });
          else run(() => deleteShoppingItem(slug, target.item.id), { onSuccess: close });
        }}
      >
        {target === "done" ? (
          <>
            담은 것 <strong>{done}개</strong>를 장보기 목록에서 지울까요?
          </>
        ) : (
          <>
            <strong>{target?.item.name}</strong> 항목을 장보기 목록에서 지울까요?
          </>
        )}
      </DeleteConfirm>
    </Stack>
  );
}
