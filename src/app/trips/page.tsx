import { Group, Stack, Text } from "@mantine/core";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { AppHeader } from "@/components/app-header";
import { LinkActionIcon } from "@/components/link-button";
import { PageShell } from "@/components/page-shell";
import { SectionTitle } from "@/components/trip/parts";
import { TripList } from "@/components/trips/trip-list";
import { isAdmin } from "@/lib/auth/admin";
import { lockedTripSlugs } from "@/lib/auth/trip-access";
import { listTrips } from "@/lib/trips/queries";

export const metadata: Metadata = { title: "여행 목록", robots: { index: false } };

export default async function TripsPage() {
  // 요청마다 DB 에서 새로 읽는다 (빌드 때 미리 만들지 않음)
  await connection();
  const [trips, admin] = await Promise.all([listTrips(), isAdmin()]);
  const locked = await lockedTripSlugs(trips);
  return (
    <PageShell>
      <AppHeader current="trips" admin={admin} />
      <Stack gap="sm">
        <Group justify="space-between" gap="xs">
          <SectionTitle count={`${trips.length}개`}>여행 목록</SectionTitle>
          {admin && (
            <LinkActionIcon href="/" aria-label="새 여행" variant="filled">
              <Plus aria-hidden size={18} />
            </LinkActionIcon>
          )}
        </Group>
        <TripList trips={trips} admin={admin} locked={[...locked]} />
        {admin && (
          <Text size="xs" c="dimmed">
            지우면 멤버·지출·장보기까지 함께 사라지고 되돌릴 수 없어요.
          </Text>
        )}
      </Stack>
    </PageShell>
  );
}
