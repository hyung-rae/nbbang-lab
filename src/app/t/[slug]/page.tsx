import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { PageShell } from "@/components/page-shell";
import { TripApp } from "@/components/trip/trip-app";
import { TripGate } from "@/components/trips/trip-gate";
import { isAdmin } from "@/lib/auth/admin";
import { canEnterTrip } from "@/lib/auth/trip-access";
import { todayIn } from "@/lib/domain/dates";
import { getTripBySlug, getTripGate } from "@/lib/trips/queries";
import { fetchCurrentWeather } from "@/lib/weather/open-meteo";

// 여행 링크는 검색에 노출하지 않는다
export async function generateMetadata({ params }: PageProps<"/t/[slug]">): Promise<Metadata> {
  const gate = await getTripGate((await params).slug);
  // 루트 레이아웃의 title.template 으로 "여행 이름 · 엔빵" (이름은 여행 목록에도 보이는 값이라 잠긴 여행도 그대로)
  return { title: gate?.name ?? "여행", robots: { index: false } };
}

export default async function TripPage({ params }: PageProps<"/t/[slug]">) {
  const { slug } = await params;
  const [gate, admin] = await Promise.all([getTripGate(slug), isAdmin()]);
  if (!gate) notFound();
  // 입장 표가 없으면 여행 데이터는 읽지도 보내지도 않고 입장 화면만
  if (!(await canEnterTrip(slug, gate.password))) {
    return (
      <PageShell>
        <AppHeader />
        <TripGate slug={slug} name={gate.name} />
      </PageShell>
    );
  }
  const data = await getTripBySlug(slug);
  if (!data) notFound();
  // await 하지 않는다 — 날씨를 기다리는 동안에도 여행 화면을 먼저 보낸다
  const weather = data.coords ? fetchCurrentWeather(data.coords) : Promise.resolve(null);
  // 설정 탭에서 보여 줄 입장 비밀번호는 관리자에게만 넘긴다
  return (
    <TripApp
      data={data}
      today={todayIn("Asia/Seoul")}
      weather={weather}
      admin={admin}
      entryPassword={admin ? gate.password : null}
    />
  );
}
