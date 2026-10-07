"use client";

import { Box, Group, Paper, Text, UnstyledButton } from "@mantine/core";
import Link from "next/link";
import { useState } from "react";
import classes from "@/components/list.module.css";
import { DeleteConfirm, Empty, TrashButton, useAction } from "@/components/trip/parts";
import { formatDate } from "@/lib/domain/dates";
import { won } from "@/lib/domain/format";
import { deleteTrip } from "@/lib/trips/actions";
import type { TripSummary } from "@/lib/trips/queries";

function dateText(t: TripSummary) {
  if (!t.start) return "날짜 미정";
  return t.end && t.end !== t.start ? `${formatDate(t.start)} – ${formatDate(t.end)}` : formatDate(t.start);
}

/** 여행을 눌러 들어가고, 휴지통 → 확인 창에서 삭제 */
export function TripList({ trips }: { trips: TripSummary[] }) {
  const { pending, run } = useAction();
  const [target, setTarget] = useState<TripSummary | null>(null);
  const [opened, setOpened] = useState(false);

  // 마지막 여행을 지워 목록이 비어도 확인 창은 닫히는 전환을 마치도록 목록 분기 밖에 둔다
  return (
    <>
      {!trips.length ? (
        <Empty title="아직 만든 여행이 없어요">
          <Text size="sm">
            위의 <strong>+</strong> 버튼으로 첫 여행을 만들어 보세요.
          </Text>
        </Empty>
      ) : (
        <Paper component="ul" withBorder radius="lg" className={classes.list}>
          {trips.map((t) => (
            <Group component="li" key={t.slug} className={`${classes.row} ${classes.hoverRow}`} gap={4} pr="xs" wrap="nowrap">
              <UnstyledButton component={Link} href={`/t/${t.slug}`} className={classes.press} flex={1} miw={0}>
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
              </UnstyledButton>
              <TrashButton
                label={`${t.name} 삭제`}
                disabled={pending}
                onClick={() => {
                  setTarget(t);
                  setOpened(true);
                }}
              />
            </Group>
          ))}
        </Paper>
      )}

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
