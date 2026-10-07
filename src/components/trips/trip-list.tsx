"use client";

import { Box, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
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
      <Text fw={600} truncate>
        {t.name}
      </Text>
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
 * 여행을 누르면 참여자는 입장 비밀번호 창 → 맞으면 이동, 관리자는 바로 이동.
 * 링크 복사(누구나), (관리자만) 휴지통 → 확인 창에서 삭제
 */
export function TripList({ trips, admin }: { trips: TripSummary[]; admin: boolean }) {
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
                {admin ? (
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
