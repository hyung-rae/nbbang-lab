"use client";

import { Badge, Box, Group, Paper, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import classes from "@/components/list.module.css";
import { dayLabel, formatDate } from "@/lib/domain/dates";
import { groupByDate, perPersonLabel, splitSummary } from "@/lib/domain/expense-view";
import { won } from "@/lib/domain/format";
import type { TripData } from "@/lib/domain/types";
import { CategoryDot, Empty } from "./parts";

export function ExpenseListTab({ data, onEdit }: { data: TripData; onEdit: (id: string) => void }) {
  const { members, expenses, trip } = data;
  if (!expenses.length) {
    return (
      <Empty title="아직 기록한 지출이 없어요">
        <Text size="sm">
          아래 <strong>지출 추가</strong> 버튼으로 첫 지출을 적어 보세요.
        </Text>
      </Empty>
    );
  }
  return (
    <>
      {groupByDate(expenses).map((g) => (
        <Stack component="section" key={g.date} gap="xs">
          <Group justify="space-between" align="baseline" gap="xs" px={4}>
            <Title order={2} size="h6">
              {dayLabel(trip, g.date)}
              {formatDate(g.date)}
            </Title>
            <Text size="sm" c="dimmed">
              {won(g.sum)}
            </Text>
          </Group>
          <Paper component="ul" withBorder radius="lg" className={classes.list}>
            {g.expenses.map((e) => {
              const payer = members.find((m) => m.id === e.payerId);
              const per = perPersonLabel(members, e);
              return (
                <li key={e.id} className={classes.row}>
                  <UnstyledButton className={classes.press} onClick={() => onEdit(e.id)} aria-label={`${e.title} 고치기`}>
                    {/* 분류 배지는 제목 위 — 옆에 두면 배지 너비만큼 제목 시작이 줄마다 달라진다 */}
                    <Box flex={1} miw={0}>
                      <Badge
                        variant="default"
                        radius="xl"
                        size="sm"
                        fw={500}
                        mb={4}
                        leftSection={<CategoryDot category={e.category} size={8} />}
                        style={{ textTransform: "none" }}
                      >
                        {e.category}
                      </Badge>
                      <Text fw={500}>{e.title}</Text>
                      <Text size="xs" c="dimmed">
                        {payer ? `${payer.name} 결제` : "결제자 없음"} · {splitSummary(members, e)}
                      </Text>
                    </Box>
                    <Box ta="right" style={{ flex: "none" }}>
                      <Text fw={700}>{won(e.amount)}</Text>
                      {per && (
                        <Text size="xs" c="dimmed">
                          {per}
                        </Text>
                      )}
                    </Box>
                  </UnstyledButton>
                </li>
              );
            })}
          </Paper>
        </Stack>
      ))}
    </>
  );
}
