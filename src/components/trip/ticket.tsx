"use client";

import { Badge, Box, Group, SimpleGrid, Text, Title, UnstyledButton, VisuallyHidden } from "@mantine/core";
import { Copy, MapPin, RotateCw, Thermometer } from "lucide-react";
import Image from "next/image";
import { Suspense, use, useState } from "react";
import { toast } from "@/components/notify";
import { tripBadge, tripDateRange } from "@/lib/domain/dates";
import { won } from "@/lib/domain/format";
import type { TripData } from "@/lib/domain/types";
import { type CurrentWeather, newerWeather, weatherOf, weatherTime } from "@/lib/domain/weather";
import { refreshWeather } from "@/lib/weather/actions";
import { copyText } from "./parts";
import classes from "./ticket.module.css";

const MAPS = [
  { name: "네이버 지도", logo: "/brands/naver-map.png", href: (q: string) => `https://map.naver.com/p/search/${q}` },
  { name: "카카오맵", logo: "/brands/kakao-map.png", href: (q: string) => `https://map.kakao.com/link/search/${q}` },
];

/** 숙소 패널 한 줄: 왼쪽 아이콘 열 · 내용 · 오른쪽 버튼 */
function PanelRow({ icon, end, children }: { icon: React.ReactNode; end?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Group gap={10} wrap="nowrap" mih={44}>
      <Box component="span" display="flex" style={{ flex: "none", opacity: 0.85 }}>
        {icon}
      </Box>
      <Box flex={1} miw={0}>
        {children}
      </Box>
      {end && (
        <Group gap={6} wrap="nowrap" style={{ flex: "none" }}>
          {end}
        </Group>
      )}
    </Group>
  );
}

/** 숙소 패널 둘째 줄: 지금 날씨 "☁️ 흐림 18° · 체감 16°" + 기준 시각 + 새로고침 */
function WeatherLine({ slug, weather }: { slug: string; weather: Promise<CurrentWeather | null> }) {
  const fromServer = use(weather);
  // 새로고침으로 받은 값. 실시간 갱신으로 서버 값이 새로 오면 더 최근 관측을 보여 준다
  const [refreshed, setRefreshed] = useState<CurrentWeather | null>(null);
  const [loading, setLoading] = useState(false);
  const w = newerWeather(fromServer, refreshed);
  if (!w) return null;
  const { icon, label } = weatherOf(w.code);

  const reload = async () => {
    setLoading(true);
    // 오프라인·배포 교체(액션 id 바뀜) 때는 호출 자체가 실패한다 — 버튼이 돌기만 하지 않게
    const got = await refreshWeather(slug).catch(() => null);
    setLoading(false);
    if (!got) return toast.error("날씨를 받지 못했어요. 잠시 뒤 다시 눌러 주세요");
    setRefreshed(got);
    // Open-Meteo 현재 값은 15분 간격이라 값이 그대로일 때가 많다 — 받았다는 것만은 알린다
    toast(`날씨를 새로 받았어요 · ${weatherTime(got.time)}`);
  };

  return (
    <PanelRow
      icon={<Thermometer aria-hidden size={16} />}
      end={
        <UnstyledButton
          className={classes.iconButton}
          aria-label="날씨 새로고침"
          title="날씨 새로고침 (Open-Meteo, 15분마다 갱신)"
          disabled={loading}
          onClick={reload}
        >
          <RotateCw aria-hidden size={16} className={loading ? classes.spin : undefined} />
        </UnstyledButton>
      }
    >
      <VisuallyHidden>숙소 지역 지금 날씨: </VisuallyHidden>
      <div aria-live="polite">
        <span aria-hidden>
          {icon} {label} {w.temp}° · 체감 {w.feels}°
        </span>
        <VisuallyHidden>{`${label}, 기온 ${w.temp}도, 체감 ${w.feels}도, `}</VisuallyHidden>
        {/* Open-Meteo 데이터는 CC BY 4.0 — 출처를 화면에 표기한다 */}
        <div className={classes.time}>
          {weatherTime(w.time)} ·{" "}
          <a className={classes.source} href="https://open-meteo.com/" target="_blank" rel="noopener">
            Open-Meteo
          </a>
        </div>
      </div>
    </PanelRow>
  );
}

function TripInfo({ slug, address, weather }: { slug: string; address: string; weather: Promise<CurrentWeather | null> }) {
  const q = encodeURIComponent(address);
  return (
    <div className={classes.address}>
      <PanelRow
        icon={<MapPin aria-hidden size={16} />}
        end={
          <>
            <UnstyledButton
              className={classes.iconButton}
              aria-label="주소 복사"
              title="주소 복사"
              onClick={async () =>
                toast((await copyText(address)) ? "주소를 복사했어요" : "복사하지 못했어요. 주소를 길게 눌러 복사하세요")
              }
            >
              <Copy aria-hidden size={16} />
            </UnstyledButton>
            {MAPS.map((m) => (
              <a
                key={m.name}
                className={classes.iconButton}
                href={m.href(q)}
                target="_blank"
                rel="noopener"
                aria-label={`${m.name}에서 보기`}
                title={m.name}
              >
                <Image src={m.logo} alt="" width={24} height={24} className={classes.logo} />
              </a>
            ))}
          </>
        }
      >
        <span style={{ userSelect: "all" }}>
          <VisuallyHidden>숙소 주소 </VisuallyHidden>
          {address}
        </span>
      </PanelRow>
      {/* 날씨가 늦거나 실패해도 티켓·탭 내용은 먼저 뜬다 */}
      <Suspense
        fallback={
          <PanelRow icon={<Thermometer aria-hidden size={16} />}>
            <span className={classes.time}>날씨 받는 중…</span>
          </PanelRow>
        }
      >
        {/* 주소가 바뀌면 새로고침해 둔 옛 지역 날씨를 버린다 (key 로 상태 초기화) */}
        <WeatherLine key={address} slug={slug} weather={weather} />
      </Suspense>
    </div>
  );
}

export function Ticket({
  data,
  today,
  total,
  weather,
}: {
  data: TripData;
  today: string;
  total: number;
  weather: Promise<CurrentWeather | null>;
}) {
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
        {address && <TripInfo slug={data.slug} address={address} weather={weather} />}
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
