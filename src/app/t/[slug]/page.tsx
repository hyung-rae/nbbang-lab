import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TripApp } from "@/components/trip/trip-app";
import { todayIn } from "@/lib/domain/dates";
import { getTripBySlug } from "@/lib/trips/queries";
import { fetchCurrentWeather } from "@/lib/weather/open-meteo";

// 여행 링크는 그 자체가 접근 권한이라 검색에 노출하지 않는다
export async function generateMetadata({ params }: PageProps<"/t/[slug]">): Promise<Metadata> {
  const data = await getTripBySlug((await params).slug);
  // 루트 레이아웃의 title.template 으로 "여행 이름 · 엔빵"
  return { title: data?.trip.name ?? "여행", robots: { index: false } };
}

export default async function TripPage({ params }: PageProps<"/t/[slug]">) {
  const { slug } = await params;
  const data = await getTripBySlug(slug);
  if (!data) notFound();
  // await 하지 않는다 — 날씨를 기다리는 동안에도 여행 화면을 먼저 보낸다
  const weather = data.coords ? fetchCurrentWeather(data.coords) : Promise.resolve(null);
  return <TripApp data={data} today={todayIn("Asia/Seoul")} weather={weather} />;
}
