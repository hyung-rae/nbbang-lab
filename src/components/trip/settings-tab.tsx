"use client";

import { Badge, Button, ColorSwatch, Group, Paper, Popover, SimpleGrid, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { Check } from "lucide-react";
import { useState } from "react";
import { DateRangePicker } from "@/components/form/date-picker";
import classes from "@/components/list.module.css";
import { usageCount } from "@/lib/domain/expense-view";
import type { Member, TripData } from "@/lib/domain/types";
import { saveSettings } from "@/lib/trips/actions";
import { MAX_MEMBERS, firstError, memberNameSchema, settingsSchema } from "@/lib/trips/schema";
import {
  Avatar,
  DeleteConfirm,
  MEMBER_COLORS,
  SectionTitle,
  TrashButton,
  filledColor,
  INK_ON_FILLED,
  useAction,
} from "./parts";

export function SettingsTab({ data, entryPassword }: { data: TripData; entryPassword: string | null }) {
  return <SettingsForm data={data} entryPassword={entryPassword} />;
}

type TripFields = { name: string; start: string; end: string; address: string; password: string };
type NewMember = { key: string; name: string; color: number };
/** 목록 한 줄: 지금 멤버(색은 고친 값) 또는 저장 전 새 멤버 */
type Row = { kind: "member"; member: Member } | { kind: "new"; member: Member; key: string };

/*
 * 설정 화면 한 번에 저장 (2026-10-07 사용자 결정): 여행 정보·멤버 추가·빼기·색을 고쳐 두고 [저장] 한 번에 반영한다.
 * 실시간 갱신으로 data 가 바뀌어도 맞도록 "바뀐 것만" 들고 나머지는 지금 값을 보여 준다
 * — 고친 여행 정보 칸 · 뺄 멤버 id · 바꾼 색 · 새 멤버. 그사이 다른 곳에서 사라진 멤버에 대한 편집은 걸러 낸다.
 */
function SettingsForm({ data, entryPassword }: { data: TripData; entryPassword: string | null }) {
  const t = data.trip;
  const current: TripFields = {
    name: t.name,
    start: t.start ?? "",
    end: t.end ?? "",
    address: t.address ?? "",
    password: entryPassword ?? "",
  };
  const [tripEdits, setTripEdits] = useState<Partial<TripFields>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const [colorEdits, setColorEdits] = useState<Record<string, number>>({});
  const [added, setAdded] = useState<NewMember[]>([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<Row | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { pending, run } = useAction();

  const form: TripFields = { ...current, ...tripEdits };
  const setForm = (next: TripFields) =>
    setTripEdits(Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== current[k as keyof TripFields])));
  const set = (k: keyof TripFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.currentTarget.value });

  // 지금 있는 멤버에 대한 편집만 (다른 곳에서 빠진 멤버는 무시). 빼기로 한 뒤 그사이 다른 화면에서 지출에 들어간 사람은
  // 뺄 수 없으니 빼기 예정에서 풀어 다시 보여 준다 — 안 그러면 숨은 채로 저장이 계속 실패한다(실측)
  const removable = new Set(data.members.filter((m) => usageCount(m.id, data.expenses) === 0).map((m) => m.id));
  const removeIds = removed.filter((id) => removable.has(id));
  const colorChanges = data.members
    .filter((m) => !removeIds.includes(m.id) && colorEdits[m.id] !== undefined && colorEdits[m.id] !== m.color)
    .map((m) => ({ id: m.id, color: colorEdits[m.id] }));
  const tripChanged = Object.keys(tripEdits).length > 0;
  const dirty = tripChanged || removeIds.length > 0 || colorChanges.length > 0 || added.length > 0;

  const rows: Row[] = [
    ...data.members
      .filter((m) => !removeIds.includes(m.id))
      .map((m): Row => ({ kind: "member", member: { ...m, color: colorEdits[m.id] ?? m.color } })),
    ...added.map((a): Row => ({ kind: "new", key: a.key, member: { id: a.key, name: a.name, color: a.color } })),
  ];

  function reset() {
    setTripEdits({});
    setRemoved([]);
    setColorEdits({});
    setAdded([]);
    setNewName("");
    setError("");
  }

  function setColor(row: Row, color: number) {
    if (row.kind === "new") setAdded((a) => a.map((x) => (x.key === row.key ? { ...x, color } : x)));
    else setColorEdits((c) => ({ ...c, [row.member.id]: color }));
  }

  function addMember() {
    const parsed = memberNameSchema.safeParse(newName);
    const msg = !parsed.success
      ? firstError(parsed.error)
      : rows.length >= MAX_MEMBERS
        ? `최대 ${MAX_MEMBERS}명까지 추가할 수 있어요.`
        : rows.some((r) => r.member.name === parsed.data)
          ? "같은 이름이 이미 있어요. 구별되게 적어 주세요."
          : "";
    if (msg || !parsed.success) {
      setError(msg);
      return;
    }
    // 새 사람 색은 아직 아무도 안 쓴 가장 작은 번호, 다 쓰면 인원 순서대로
    const used = new Set(rows.map((r) => r.member.color));
    const color = MEMBER_COLORS.findIndex((_, i) => !used.has(i));
    setAdded((a) => [...a, { key: crypto.randomUUID(), name: parsed.data, color: color === -1 ? rows.length % MEMBER_COLORS.length : color }]);
    setNewName("");
    setError("");
    document.getElementById("m-name")?.focus();
  }

  function removeRow(row: Row) {
    if (row.kind === "new") setAdded((a) => a.filter((x) => x.key !== row.key));
    else setRemoved((r) => [...r, row.member.id]);
  }

  function submit() {
    // 비밀번호는 고쳤을 때만 싣는다 — 안 고친 칸까지 보내면 그사이 다른 탭에서 바꾼 비밀번호를 이 화면의 옛 값으로 되돌린다
    const { password, ...info } = form;
    const input = {
      trip: tripChanged ? (tripEdits.password !== undefined ? { ...info, password } : info) : null,
      remove: removeIds,
      colors: colorChanges,
      add: added.map(({ name, color }) => ({ name, color })),
    };
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
      setError(firstError(parsed.error));
      return;
    }
    setError("");
    run(() => saveSettings(data.slug, input), { success: "저장했어요", onSuccess: reset, onError: setError });
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {/* 저장 중에는 편집을 막는다 — 응답 전에 고친 내용이 성공 후 reset() 으로 조용히 사라지지 않게 (코드 리뷰) */}
      <fieldset disabled={pending} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        <Stack gap={36}>
          <Stack component="section" gap="sm">
            <SectionTitle>여행 정보</SectionTitle>
            <Paper withBorder radius="lg" p="md">
              <Stack gap="sm">
                <TextInput id="t-name" label="여행 이름" maxLength={30} autoComplete="off" value={form.name} onChange={set("name")} />
                <DateRangePicker
                  id="t-dates"
                  label="여행 날짜"
                  start={form.start}
                  end={form.end}
                  onChange={(start, end) => setForm({ ...form, start, end })}
                />
                <TextInput
                  id="t-address"
                  label="숙소 주소"
                  maxLength={100}
                  autoComplete="off"
                  placeholder="예: 경기 가평군 설악면 …"
                  value={form.address}
                  onChange={set("address")}
                />
                {/* 관리자가 다시 보고 친구들에게 알려 주도록 가리지 않는다(사용자 결정). 바꾸면 이미 들어온 기기도 다시 입력해야 한다 */}
                <TextInput
                  id="t-password"
                  label="입장 비밀번호"
                  description="4~20자. 바꾸면 이미 들어온 친구들도 다시 입력해야 해요. 비우면 비밀번호 없이 들어와요."
                  autoComplete="off"
                  value={form.password}
                  onChange={set("password")}
                />
              </Stack>
            </Paper>
          </Stack>

          <Stack component="section" gap="sm">
            <SectionTitle count={`${rows.length}명`}>함께 가는 사람</SectionTitle>
            <Paper component="ul" withBorder radius="lg" className={classes.list}>
              {rows.length ? (
                rows.map((row) => {
                  const m = row.member;
                  const used = row.kind === "member" ? usageCount(m.id, data.expenses) : 0;
                  return (
                    <Group
                      component="li"
                      key={row.kind === "new" ? row.key : m.id}
                      className={classes.row}
                      gap={10}
                      mih={56}
                      py={8}
                      pl={14}
                      pr={10}
                      wrap="nowrap"
                    >
                      <ColorPick member={m} onPick={(c) => setColor(row, c)} />
                      <Group gap={6} flex={1} miw={0} wrap="nowrap">
                        <Text fw={600} truncate>
                          {m.name}
                        </Text>
                        {row.kind === "new" && (
                          <Badge size="xs" variant="light">
                            새로
                          </Badge>
                        )}
                      </Group>
                      {used ? (
                        <Text size="xs" c="dimmed">
                          지출 {used}건에 포함
                        </Text>
                      ) : (
                        <TrashButton
                          label={`${m.name} 빼기`}
                          disabled={pending}
                          onClick={() => {
                            setConfirm(row);
                            setConfirmOpen(true);
                          }}
                        />
                      )}
                    </Group>
                  );
                })
              ) : (
                <Text component="li" size="sm" c="dimmed" p={14}>
                  아직 아무도 없어요. 아래에서 이름을 추가하세요.
                </Text>
              )}
            </Paper>
            <Group gap="xs" wrap="nowrap">
              <TextInput
                id="m-name"
                aria-label="친구 이름"
                flex={1}
                maxLength={10}
                placeholder="친구 이름"
                autoComplete="off"
                value={newName}
                onChange={(e) => setNewName(e.currentTarget.value)}
                // 폼 전체가 [저장] 이므로 Enter 는 저장이 아니라 사람 추가
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    addMember();
                  }
                }}
              />
              <Button variant="default" onClick={addMember} style={{ flex: "none" }}>
                추가
              </Button>
            </Group>
            <Text size="xs" c="dimmed">
              아바타를 누르면 색을 바꿀 수 있어요. 지출에 들어간 사람은 뺄 수 없어요.
            </Text>
          </Stack>

          <Stack gap="xs">
            {error && (
              <Text size="sm" c="red" fw={500} role="alert">
                {error}
              </Text>
            )}
            <Group justify="flex-end" gap="xs">
              {dirty && (
                <Text size="xs" c="dimmed" mr="auto">
                  [저장]을 눌러야 반영돼요.
                </Text>
              )}
              <Button variant="default" disabled={!dirty || pending} onClick={reset}>
                되돌리기
              </Button>
              <Button type="submit" disabled={!dirty} loading={pending}>
                저장
              </Button>
            </Group>
          </Stack>
        </Stack>
      </fieldset>

      <DeleteConfirm
        opened={confirmOpen}
        title="함께 가는 사람 빼기"
        confirmLabel="빼기"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (confirm) removeRow(confirm);
          setConfirmOpen(false);
        }}
      >
        <strong>{confirm?.member.name}</strong> 님을 이 여행에서 뺄까요?
        {confirm?.kind === "member" && confirm.member.id === data.takerId && (
          <>
            <br />
            좀 더 착한 사람으로 정해 둔 사람이라, 빼면 끝전은 가장 많이 받을 사람이 맡아요.
          </>
        )}
        {confirm?.kind === "member" && (
          <>
            <br />
            [저장]을 눌러야 반영돼요.
          </>
        )}
      </DeleteConfirm>
    </form>
  );
}

/** 아바타를 누르면 12색 중에서 고르기 */
function ColorPick({ member, onPick }: { member: Member; onPick: (color: number) => void }) {
  const [opened, setOpened] = useState(false);
  return (
    // 키보드로도 고를 수 있게 열리면 팔레트 안에 포커스를 가두고(현재 색에서 시작), 닫히면 아바타로 돌려준다
    <Popover opened={opened} onChange={setOpened} position="bottom-start" shadow="md" withArrow trapFocus returnFocus>
      <Popover.Target>
        <UnstyledButton aria-label={`${member.name} 색 바꾸기`} onClick={() => setOpened((o) => !o)} style={{ borderRadius: "50%" }}>
          <Avatar member={member} />
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <SimpleGrid cols={6} spacing={8}>
          {MEMBER_COLORS.map((c, i) => (
            <ColorSwatch
              key={c}
              component="button"
              type="button"
              aria-label={`${i + 1}번 색`}
              aria-pressed={member.color === i}
              data-autofocus={member.color === i || undefined}
              color={filledColor(c)}
              size={28}
              onClick={() => {
                onPick(i);
                setOpened(false);
              }}
              style={{ color: INK_ON_FILLED, cursor: "pointer" }}
            >
              {member.color === i && <Check aria-hidden size={16} />}
            </ColorSwatch>
          ))}
        </SimpleGrid>
      </Popover.Dropdown>
    </Popover>
  );
}
