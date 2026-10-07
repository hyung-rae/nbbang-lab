"use client";

import { Box, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CopyLinkButton } from "@/components/copy-link-button";
import classes from "@/components/list.module.css";
import cards from "@/components/trips/trip-list.module.css";
import { DeleteConfirm, Empty, TrashButton, useAction } from "@/components/trip/parts";
import { TripPasswordModal } from "@/components/trips/trip-password-modal";
import { formatDate } from "@/lib/domain/dates";
import { won } from "@/lib/domain/format";
import { deleteTrip } from "@/lib/trips/actions";
import type { TripSummary } from "@/lib/trips/queries";

function dateText(t: TripSummary) {
  if (!t.start) return "날짜 미정";
  return t.end && t.end !== t.start ? `${formatDate(t.start)} – ${formatDate(t.end)}` : formatDate(t.start);
}

function TripSummaryText({ trip: t }: { trip: TripSummary }) {
  return (
    <Box flex={1} miw={0}>
      <Group gap={6} wrap="nowrap">
        <Text fw={600} truncate>
          {t.name}
        </Text>
        {/* 입장 비밀번호가 있는 여행 표시 */}
        {t.hasPassword && <Lock aria-label="비밀번호 있음" size={14} className={cards.lock} />}
      </Group>
      <Text size="xs" c="dimmed">
        {dateText(t)}
      </Text>
      <Text size="xs" c="dimmed">
        {t.memberCount}명 · 지출 {t.expenseCount}건 · {won(t.total)}
      </Text>
    </Box>
  );
}

/**
 * 여행을 누르면 바로 이동. 비밀번호를 넣어야 하는 여행(locked — 서버가 판정, 관리자는 늘 비어 있음)만 입장 창 → 맞으면 이동.
 * 링크 복사(누구나 — 링크로 들어와도 서버가 입장 화면을 보인다), (관리자만) 휴지통 → 확인 창에서 삭제
 */
export function TripList({ trips, admin, locked }: { trips: TripSummary[]; admin: boolean; locked: string[] }) {
  const { pending, run } = useAction();
  const [target, setTarget] = useState<TripSummary | null>(null);
  const [opened, setOpened] = useState(false);
  // 비밀번호 창도 대상과 opened 를 따로 들어 닫히는 동안 여행 이름이 남게 한다
  const [entry, setEntry] = useState<TripSummary | null>(null);
  const [entryOpened, setEntryOpened] = useState(false);

  // 마지막 여행을 지워 목록이 비어도 확인 창은 닫히는 전환을 마치도록 목록 분기 밖에 둔다
  return (
    <>
      {!trips.length ? (
        <Empty title="아직 만든 여행이 없어요">
          {admin && (
            <Text size="sm">
              위의 <strong>+</strong> 버튼으로 첫 여행을 만들어 보세요.
            </Text>
          )}
        </Empty>
      ) : (
        <Stack component="ul" gap="sm" className={cards.cards}>
          {trips.map((t) => (
            <Paper component="li" key={t.slug} withBorder radius="lg" className={cards.card}>
              <Group className={classes.hoverRow} gap={4} pr="xs" wrap="nowrap">
                {!locked.includes(t.slug) ? (
                  <UnstyledButton component={Link} href={`/t/${t.slug}`} className={classes.press} flex={1} miw={0}>
                    <TripSummaryText trip={t} />
                  </UnstyledButton>
                ) : (
                  <UnstyledButton
                    className={classes.press}
                    flex={1}
                    miw={0}
                    aria-haspopup="dialog"
                    onClick={() => {
                      setEntry(t);
                      setEntryOpened(true);
                    }}
                  >
                    <TripSummaryText trip={t} />
                  </UnstyledButton>
                )}
                <CopyLinkButton path={`/t/${t.slug}`} label={`${t.name} 링크 복사`} variant="subtle" color="gray" />
                {admin && (
                  <TrashButton
                    label={`${t.name} 삭제`}
                    disabled={pending}
                    onClick={() => {
                      setTarget(t);
                      setOpened(true);
                    }}
                  />
                )}
              </Group>
            </Paper>
          ))}
        </Stack>
      )}

      <TripPasswordModal trip={entry} opened={entryOpened} onClose={() => setEntryOpened(false)} />

      <DeleteConfirm
        opened={opened}
        title="여행 삭제"
        loading={pending}
        onClose={() => setOpened(false)}
        onConfirm={() => {
          if (!target) return;
          run(() => deleteTrip(target.slug), {
            success: `'${target.name}' 여행을 지웠어요`,
            onSuccess: () => setOpened(false),
          });
        }}
      >
        <strong>{target?.name}</strong> 여행을 지울까요?
        <br />
        멤버·지출·장보기까지 함께 사라지고 되돌릴 수 없어요.
      </DeleteConfirm>
    </>
  );
}
