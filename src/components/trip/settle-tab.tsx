"use client";

import { ActionIcon, Badge, Box, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { Share2 } from "lucide-react";
import { useState } from "react";
import classes from "@/components/list.module.css";
import { toast } from "@/components/notify";
import { settlementText } from "@/lib/domain/expense-view";
import { won } from "@/lib/domain/format";
import type { Settlement } from "@/lib/domain/settle";
import type { CategoryRow } from "@/lib/domain/treemap";
import type { Member, TripData } from "@/lib/domain/types";
import { setTaker } from "@/lib/trips/actions";
import { Avatar, Chip, CopyFallback, SectionTitle, copyText, useAction } from "./parts";
import { Treemap } from "./treemap";

function Note({ children }: { children: React.ReactNode }) {
  return (
    <Paper withBorder radius="lg" p="md">
      <Text size="sm" c="dimmed">
        {children}
      </Text>
    </Paper>
  );
}

export function SettleTab({
  data,
  result,
  categories,
}: {
  data: TripData;
  result: Settlement;
  categories: CategoryRow[];
}) {
  const { members } = data;
  const byId = (id: string) => members.find((m) => m.id === id);
  const [fallback, setFallback] = useState("");

  async function copySettlement() {
    const text = settlementText(data.trip.name, members, result);
    if (await copyText(text)) {
      setFallback("");
      toast("정산 내용을 복사했어요");
    } else setFallback(text);
  }

  return (
    <>
      <Stack component="section" gap="sm">
        <SectionTitle>송금 정리</SectionTitle>
        {result.transfers.length ? (
          <>
            <Text size="sm" c="dimmed" mt={-4}>
              이대로 보내면 정산이 끝나요.
            </Text>
            {/* 덤탱이(화면 표기 "좀 더 착한 사람") 고르기 + 송금 목록을 한 카드로 — 바꾸면 바로 아래 금액이 바뀐다 */}
            <Paper withBorder radius="lg" style={{ overflow: "hidden" }}>
              <Taker data={data} result={result} onCopy={copySettlement} />
              <Box
                component="ol"
                className={classes.list}
                style={result.taker ? { borderTop: "1px solid var(--mantine-color-default-border)" } : undefined}
              >
                {result.transfers.map((t) => (
                  <Box
                    component="li"
                    key={`${t.from}-${t.to}`}
                    className={classes.row}
                    px={14}
                    py="sm"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0,1fr) 1.2em minmax(0,1fr) 7.2em",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Who member={byId(t.from)} />
                    <Text span c="dimmed" ta="center" aria-label="에게">
                      →
                    </Text>
                    <Who member={byId(t.to)} />
                    <Text span fw={700} ta="right" style={{ whiteSpace: "nowrap" }}>
                      {won(t.amount)}
                    </Text>
                  </Box>
                ))}
              </Box>
            </Paper>
            {fallback && <CopyFallback id="settle-copy" text={fallback} label="복사할 정산 내용" />}
          </>
        ) : (
          <Note>{result.total ? "모두 딱 맞게 냈어요. 보낼 돈이 없어요." : "아직 기록한 지출이 없어요."}</Note>
        )}
      </Stack>

      <Stack component="section" gap="sm">
        <SectionTitle>사람별</SectionTitle>
        <Text size="sm" c="dimmed" mt={-4}>
          낸 돈은 결제한 금액, 쓴 돈은 N빵한 내 몫이에요.
        </Text>
        <Paper component="ul" withBorder radius="lg" className={classes.list}>
          {members.map((m) => {
            const b = result.bal[m.id];
            const tone = b > 0 ? "teal" : b < 0 ? "red" : "dimmed";
            return (
              <Group component="li" key={m.id} className={classes.row} gap="sm" px={14} py="sm" wrap="nowrap">
                <Avatar member={m} />
                <Box flex={1} miw={0}>
                  <Text fw={600}>{m.name}</Text>
                  <Text size="xs" c="dimmed">
                    낸 돈 {won(result.paid[m.id])} · 쓴 돈 {won(result.owed[m.id])}
                  </Text>
                </Box>
                <Box ta="right" style={{ flex: "none" }}>
                  <Text fw={700} c={tone}>
                    {b > 0 ? "+" : b < 0 ? "−" : ""}
                    {won(Math.abs(b))}
                  </Text>
                  <Text size="xs" c={tone}>
                    {b > 0 ? "받을 돈" : b < 0 ? "보낼 돈" : "정산 끝"}
                  </Text>
                </Box>
              </Group>
            );
          })}
        </Paper>
      </Stack>

      <Stack component="section" gap="sm">
        <SectionTitle>어디에 썼나</SectionTitle>
        {categories.length ? (
          <>
            <Text size="sm" c="dimmed" mt={-4}>
              넓이가 쓴 돈에 비례해요. 칸이나 목록을 누르면 그 분류만 볼 수 있어요.
            </Text>
            <Treemap rows={categories} total={result.total} />
          </>
        ) : (
          <Note>지출을 기록하면 분류별로 얼마나 썼는지 보여요.</Note>
        )}
      </Stack>
    </>
  );
}

function Who({ member }: { member: Member | undefined }) {
  return (
    <Group gap={8} wrap="nowrap" miw={0}>
      <Avatar member={member} />
      <Text span fw={600} truncate>
        {member?.name ?? "?"}
      </Text>
    </Group>
  );
}

/** 좀 더 착한 사람(덤탱이) 고르기. 제목 줄: 지금 맡은 사람 칩 + 정산 내용 복사(공유 아이콘 — 여행 링크 복사와 같은 모양) */
function Taker({ data, result, onCopy }: { data: TripData; result: Settlement; onCopy: () => void }) {
  const { pending, run } = useAction();
  if (!result.taker) return null;
  const explicit = data.takerId !== null && data.members.some((m) => m.id === data.takerId);
  const taker = data.members.find((m) => m.id === result.taker);
  return (
    <Box p="md">
      <Stack gap="sm">
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Group gap="xs" miw={0} wrap="nowrap">
            <Title order={3} size="h5" style={{ whiteSpace: "nowrap" }}>
              좀 더 착한 사람
            </Title>
            {taker && (
              <Badge variant="light" size="lg" radius="xl" tt="none" pl={3} miw={0} leftSection={<Avatar member={taker} size={20} />}>
                {taker.name}
              </Badge>
            )}
          </Group>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="input-sm"
            radius="md"
            aria-label="정산 내용 복사"
            title="정산 내용 복사"
            style={{ flex: "none" }}
            onClick={onCopy}
          >
            <Share2 aria-hidden size={18} />
          </ActionIcon>
        </Group>
        <Text size="xs" c="dimmed">
          송금은 100원 단위로 끊고, 남는 끝전은 이 사람이 몰아서 내요.
          {!explicit && " 정하지 않으면 가장 많이 받을 사람이 써요."}
        </Text>
        <Group gap="xs" role="radiogroup" aria-label="좀 더 착한 사람">
          {data.members.map((m) => (
            <Chip
              key={m.id}
              type="radio"
              name="taker"
              value={m.id}
              checked={m.id === result.taker}
              disabled={pending}
              withCheck={false}
              onChange={() => run(() => setTaker(data.slug, m.id), { success: `좀 더 착한 사람은 ${m.name}` })}
            >
              <Avatar member={m} size={26} />
              {m.name}
            </Chip>
          ))}
        </Group>
      </Stack>
    </Box>
  );
}
