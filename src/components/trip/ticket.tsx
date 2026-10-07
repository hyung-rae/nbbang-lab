"use client";

import { Badge, Box, Group, SimpleGrid, Text, Title, UnstyledButton, VisuallyHidden } from "@mantine/core";
import { Copy, MapPin } from "lucide-react";
import { toast } from "@/components/notify";
import { tripBadge, tripDateRange } from "@/lib/domain/dates";
import { won } from "@/lib/domain/format";
import type { TripData } from "@/lib/domain/types";
import { copyText } from "./parts";
import classes from "./ticket.module.css";

// 외부 서비스는 로고 파일 대신 브랜드 색 이니셜 배지 (명세 여행 티켓 절)
function Brand({ kind }: { kind: "naver" | "kakao" }) {
  return (
    <span
      aria-hidden
      className={classes.brand}
      style={kind === "naver" ? { background: "#03C75A", color: "#fff" } : { background: "#FEE500", color: "#191919" }}
    >
      {kind === "naver" ? "N" : "K"}
    </span>
  );
}

/** 네이버 날씨 검색어: 시·군·구부터 읍·면·동까지 (경기 가평군 설악면 … → 가평군 설악면 날씨) */
export function weatherQuery(address: string): string {
  const t = address.split(/\s+/);
  const out: string[] = [];
  for (let i = 1; i < t.length; i++) {
    out.push(t[i]);
    if (/[읍면동]$/.test(t[i])) break;
  }
  return `${(out.length ? out : t.slice(0, 2)).join(" ")} 날씨`;
}

function TripInfo({ address }: { address: string }) {
  const q = encodeURIComponent(address);
  return (
    <>
      <Group className={classes.address} gap={10} wrap="nowrap" mih={42}>
        <MapPin aria-hidden size={16} style={{ flex: "none", opacity: 0.85 }} />
        <Box component="span" flex={1} miw={0} style={{ userSelect: "all" }}>
          <VisuallyHidden>숙소 주소 </VisuallyHidden>
          {address}
        </Box>
      </Group>
      <SimpleGrid cols={2} spacing={8} mt={10}>
        <UnstyledButton
          className={classes.link}
          onClick={async () => toast((await copyText(address)) ? "주소를 복사했어요" : "복사하지 못했어요. 주소를 길게 눌러 복사하세요")}
        >
          <Copy aria-hidden size={16} />
          주소 복사
        </UnstyledButton>
        <a className={classes.link} href={`https://map.naver.com/p/search/${q}`} target="_blank" rel="noopener">
          <Brand kind="naver" />
          네이버 지도
        </a>
        <a className={classes.link} href={`https://map.kakao.com/link/search/${q}`} target="_blank" rel="noopener">
          <Brand kind="kakao" />
          카카오맵
        </a>
        <a
          className={classes.link}
          href={`https://search.naver.com/search.naver?query=${encodeURIComponent(weatherQuery(address))}`}
          target="_blank"
          rel="noopener"
        >
          <Brand kind="naver" />
          네이버 날씨
        </a>
      </SimpleGrid>
    </>
  );
}

export function Ticket({ data, today, total }: { data: TripData; today: string; total: number }) {
  const { trip, members, expenses } = data;
  const n = members.length;
  const badge = tripBadge(trip, today);
  const dates = tripDateRange(trip);
  const address = trip.address?.trim();
  return (
    <header className={classes.ticket}>
      <div className={classes.head}>
        {badge && (
          <Badge color="yellow" c="dark" size="lg">
            {badge}
          </Badge>
        )}
        <Title order={1} mt={10} mb={4} fz="clamp(28px, 8vw, 38px)" lh={1.15} style={{ textWrap: "balance" }}>
          {trip.name || "이름 없는 여행"}
        </Title>
        <Text size="sm" opacity={0.9}>
          {dates && `${dates} · `}
          {n}명
        </Text>
        {address && <TripInfo address={address} />}
      </div>
      <SimpleGrid cols={3} spacing={8} className={classes.stats}>
        <Stat label="총 지출" value={won(total)} />
        <Stat label="1인 평균" value={won(n ? total / n : 0)} />
        <Stat label="지출 건수" value={`${expenses.length}건`} />
      </SimpleGrid>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box miw={0}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} fz="clamp(17px, 4.8vw, 22px)" lh={1.25}>
        {value}
      </Text>
    </Box>
  );
}
