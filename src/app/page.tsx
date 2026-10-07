import { Badge, Paper, Stack, Text, Title } from "@mantine/core";
import { AppHeader } from "@/components/app-header";
import { NewTripForm } from "@/components/home/new-trip-form";
import { PageShell } from "@/components/page-shell";
import { SectionTitle } from "@/components/trip/parts";
import { SITE_NAME } from "@/lib/site";

export default function Home() {
  return (
    <PageShell>
      <AppHeader />
      <Paper radius="lg" p="lg" bg="var(--mantine-primary-color-filled)" c="white">
        <Badge color="yellow" c="dark" size="lg">
          여행가서 친구들끼리
        </Badge>
        <Title order={1} mt="xs" fz="clamp(32px, 9vw, 44px)" lh={1.1}>
          {SITE_NAME}
        </Title>
        <Text size="sm" mt={6} opacity={0.9}>
          같이 쓴 돈을 적으면 누가 누구에게 얼마를 보내면 되는지 바로 보여 줘요.
          <br />
          1원 단위로 나누고, 송금은 100원 단위로 깔끔하게.
        </Text>
      </Paper>

      <Stack gap="sm">
        <SectionTitle>새 여행</SectionTitle>
        <NewTripForm />
      </Stack>
    </PageShell>
  );
}
