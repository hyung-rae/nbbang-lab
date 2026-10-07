"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TRIP_CHANGED, tripTopic } from "@/lib/realtime/topic";
import { supabaseBrowser } from "@/lib/supabase/browser";

const DEBOUNCE_MS = 300;

/**
 * 다른 화면에서 이 여행을 고치면 새로고침 없이 반영한다.
 * - 변경 신호를 받으면 router.refresh() (연달아 오면 한 번으로 묶음)
 * - 연결이 끊겼다 다시 붙거나, 폰 화면을 다시 켜서 탭이 보이게 되면 놓친 신호가 있을 수 있으니 한 번 새로 받는다
 * 자기 저장도 신호로 돌아와 한 번 더 새로 받지만, 화면 상태(열린 시트·입력 중인 값)는 유지된다.
 */
export function useLiveUpdates(slug: string) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), DEBOUNCE_MS);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    const db = supabaseBrowser();
    let joinedOnce = false;
    const channel = db
      ?.channel(tripTopic(slug))
      .on("broadcast", { event: TRIP_CHANGED }, refresh)
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        // 처음 연결은 방금 받은 화면이 최신이므로 건너뛰고, 다시 연결된 경우에만 새로 받는다
        if (joinedOnce) refresh();
        joinedOnce = true;
      });

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      if (db && channel) void db.removeChannel(channel);
    };
  }, [slug, router]);
}
