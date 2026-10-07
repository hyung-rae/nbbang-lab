"use client";

import { Copy, MapPin } from "lucide-react";
import { toast } from "sonner";
import { tripBadge, tripDateRange } from "@/lib/domain/dates";
import { won } from "@/lib/domain/format";
import type { TripData } from "@/lib/domain/types";
import { copyText } from "./parts";

// 외부 서비스는 로고 파일 대신 브랜드 색 이니셜 배지 (명세 여행 티켓 절)
function Brand({ kind }: { kind: "naver" | "kakao" }) {
  return (
    <span
      aria-hidden
      className={
        "grid size-[18px] flex-none place-items-center rounded-[5px] font-[Arial,Helvetica,sans-serif] text-[11px] leading-none font-extrabold " +
        (kind === "naver" ? "bg-[#03C75A] text-white" : "bg-[#FEE500] text-[#191919]")
      }
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

const linkClass =
  "flex min-h-10 items-center justify-center gap-[7px] rounded-[10px] bg-primary-foreground/14 px-2 text-[13.5px] font-semibold whitespace-nowrap text-primary-foreground hover:bg-primary-foreground/22";

function TripInfo({ address }: { address: string }) {
  const q = encodeURIComponent(address);
  return (
    <>
      <div className="mt-3.5 rounded-xl bg-primary-foreground/10 px-3 py-0.5">
        <div className="flex min-h-[42px] items-center gap-2.5 py-1.5 text-[13.5px] leading-snug">
          <MapPin className="size-4 flex-none opacity-85" aria-hidden />
          <span className="min-w-0 flex-1 select-all">
            <span className="sr-only">숙소 주소 </span>
            {address}
          </span>
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          className={linkClass}
          onClick={async () => toast((await copyText(address)) ? "주소를 복사했어요" : "복사하지 못했어요. 주소를 길게 눌러 복사하세요")}
        >
          <Copy className="size-4" aria-hidden />
          주소 복사
        </button>
        <a className={linkClass} href={`https://map.naver.com/p/search/${q}`} target="_blank" rel="noopener">
          <Brand kind="naver" />
          네이버 지도
        </a>
        <a className={linkClass} href={`https://map.kakao.com/link/search/${q}`} target="_blank" rel="noopener">
          <Brand kind="kakao" />
          카카오맵
        </a>
        <a
          className={linkClass}
          href={`https://search.naver.com/search.naver?query=${encodeURIComponent(weatherQuery(address))}`}
          target="_blank"
          rel="noopener"
        >
          <Brand kind="naver" />
          네이버 날씨
        </a>
      </div>
    </>
  );
}

const notch =
  "before:absolute before:-top-[11px] before:-left-2.5 before:size-5 before:rounded-full before:bg-background before:content-[''] after:absolute after:-top-[11px] after:-right-2.5 after:size-5 after:rounded-full after:bg-background after:content-['']";

export function Ticket({ data, today, total }: { data: TripData; today: string; total: number }) {
  const { trip, members, expenses } = data;
  const n = members.length;
  const badge = tripBadge(trip, today);
  const dates = tripDateRange(trip);
  const address = trip.address?.trim();
  return (
    <header className="relative rounded-[18px] bg-card shadow-app-sm">
      <div className="rounded-t-[18px] bg-primary px-5 pt-4 pb-[22px] text-primary-foreground">
        <div className="flex min-h-6 items-center justify-between gap-2">
          {badge && (
            <span className="inline-block rounded-full bg-sun px-2.5 pt-[5px] pb-1 font-heading text-[15px] leading-none text-sun-foreground">
              {badge}
            </span>
          )}
        </div>
        <h1 className="mt-2.5 mb-1 font-heading text-[clamp(28px,8vw,38px)] leading-[1.15] font-normal text-balance">
          {trip.name || "이름 없는 여행"}
        </h1>
        <p className="text-[13px] opacity-90">
          {dates && `${dates} · `}
          {n}명
        </p>
        {address && <TripInfo address={address} />}
      </div>
      <div className={`relative grid grid-cols-3 gap-2 border-t-2 border-dashed border-border px-5 py-[18px] ${notch}`}>
        <Stat label="총 지출" value={won(total)} />
        <Stat label="1인 평균" value={won(n ? total / n : 0)} />
        <Stat label="지출 건수" value={`${expenses.length}건`} />
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs tracking-[0.02em] text-muted-foreground">{label}</span>
      <strong className="font-heading text-[clamp(18px,5vw,23px)] leading-tight font-normal tabular-nums">{value}</strong>
    </div>
  );
}

export function UpdatedAt({ iso }: { iso: string }) {
  const u = new Date(iso);
  const text = `${u.toLocaleDateString("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" })} ${u.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" })}`;
  return <p className="-mt-3.5 mx-1.5 text-xs text-muted-foreground">마지막 저장 {text}</p>;
}
