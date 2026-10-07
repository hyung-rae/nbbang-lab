import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AppHeader } from "@/components/app-header";
import { TripList } from "@/components/trips/trip-list";
import { SectionTitle, btnPrimary } from "@/components/trip/parts";
import { listTrips } from "@/lib/trips/queries";

export const metadata: Metadata = { title: "여행 목록", robots: { index: false } };

export default async function TripsPage() {
  // 요청마다 DB 에서 새로 읽는다 (빌드 때 미리 만들지 않음)
  await connection();
  const trips = await listTrips();
  return (
    <main className="mx-auto flex w-full max-w-[36rem] flex-col gap-6 px-4 pt-3 pb-10">
      <AppHeader current="trips" />
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <SectionTitle count={`${trips.length}개`}>여행 목록</SectionTitle>
          <Link href="/" className={btnPrimary}>
            + 새 여행
          </Link>
        </div>
        <TripList trips={trips} />
        <p className="text-[12.5px] text-muted-foreground">
          지금은 로그인이 없어서 만든 여행이 모두 보여요. 지우면 멤버·지출·장보기까지 함께 사라지고 되돌릴 수 없어요.
        </p>
      </section>
    </main>
  );
}
