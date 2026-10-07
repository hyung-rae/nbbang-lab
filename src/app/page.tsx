import { Badge, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { AppHeader } from "@/components/app-header";
import { GitHubMark } from "@/components/github-mark";
import { HowToUse } from "@/components/home/how-to-use";
import { NewTripForm } from "@/components/home/new-trip-form";
import classes from "@/components/home/home.module.css";
import { LinkButton } from "@/components/link-button";
import { PageShell } from "@/components/page-shell";
import { SectionTitle } from "@/components/trip/parts";
import { isAdmin } from "@/lib/auth/admin";
import { REPO_URL, SITE_NAME } from "@/lib/site";

export default async function Home() {
  // 새 여행은 관리자만 만든다(2026-10-07 결정). 참여자는 받은 여행 링크나 여행 목록으로 들어간다
  const admin = await isAdmin();
  return (
    <PageShell>
      <AppHeader admin={admin} />
      <Paper radius="lg" p="lg" bg="var(--mantine-primary-color-filled)" c="white">
        <Badge color="yellow" c="dark" size="lg">
          여행가서 친구들끼리
        </Badge>
        <Group gap={10} mt="xs" wrap="nowrap">
          <Image src="/icon-192.png" alt="" width={44} height={44} priority className={classes.titleLogo} />
          <Title order={1} fz="clamp(32px, 9vw, 44px)" lh={1.1}>
            {SITE_NAME}
          </Title>
        </Group>
        <Text size="sm" mt={6} opacity={0.9}>
          같이 쓴 돈을 적으면 누가 누구에게 얼마를 보내면 되는지 바로 보여 줘요.
          <br />
          1원 단위로 나누고, 송금은 100원 단위로 깔끔하게.
        </Text>
        <Text size="xs" mt="sm" opacity={0.8}>
          여행 링크 하나로 친구들이 로그인 없이 함께 적고, 입력하면 모두의 화면이 바로 바뀌어요.
          <br />
          장보기 목록 · 몰빵 게임 · 숙소 날씨 · 여행 플레이리스트도 함께.
        </Text>
        <Text component="a" href={REPO_URL} target="_blank" rel="noopener" size="xs" mt="sm" className={classes.repo}>
          <GitHubMark size={14} />
          GitHub 에서 소스 보기
        </Text>
        <HowToUse />
        {/* 참여자는 여기서 여행 목록으로 — 관리자는 아래 새 여행 폼(목록은 헤더 버튼) */}
        {!admin && (
          <Group justify="flex-end" mt="md">
            <LinkButton
              href="/trips"
              variant="white"
              size="md"
              className={classes.toTrips}
              rightSection={<ArrowRight aria-hidden size={18} className={classes.arrow} />}
            >
              여행 목록 보기
            </LinkButton>
          </Group>
        )}
      </Paper>

      {admin && (
        <Stack gap="sm">
          <SectionTitle>새 여행</SectionTitle>
          <NewTripForm />
        </Stack>
      )}
    </PageShell>
  );
}
