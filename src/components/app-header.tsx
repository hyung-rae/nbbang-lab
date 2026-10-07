import { List } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

/** 모든 화면 위쪽 앱 바: 왼쪽 엔빵 로고(홈), 오른쪽 여행 목록 */
export function AppHeader({ current }: { current?: "trips" }) {
  return (
    <header className="flex min-h-11 items-center justify-between gap-2">
      <Link href="/" className="-ml-1 flex items-center gap-2 rounded-lg px-1 py-1">
        {/* 검은 실루엣이라 다크 모드에서는 반전 */}
        <Image src="/icon-192.png" alt="" width={30} height={30} priority className="dark:invert" />
        <span className="font-heading text-[22px] leading-none">{SITE_NAME}</span>
      </Link>
      <Link
        href="/trips"
        aria-current={current === "trips" ? "page" : undefined}
        className={cn(
          "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm font-semibold",
          "aria-[current=page]:border-primary aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground",
        )}
      >
        <List aria-hidden className="size-4" />
        여행 목록
      </Link>
    </header>
  );
}
