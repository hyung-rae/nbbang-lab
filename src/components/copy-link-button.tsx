"use client";

import { ActionIcon, type ActionIconProps } from "@mantine/core";
import { Share2 } from "lucide-react";
import { toast } from "@/components/notify";
import { copyText } from "@/components/trip/parts";

/**
 * 여행 링크 복사 아이콘 버튼. path 는 "/t/<slug>" — 지금 주소(origin)를 붙여 복사한다.
 * 클립보드가 막힌 곳(카카오톡 인앱 브라우저 등)은 기기 공유 시트로, 그것도 없으면 링크를 알림에 띄운다
 * (여행 목록에서는 주소창이 /trips 라 "주소창에서 복사" 안내가 틀린다)
 */
export function CopyLinkButton({ path, label, ...props }: { path: string; label: string } & ActionIconProps) {
  return (
    <ActionIcon
      size="input-sm"
      radius="md"
      aria-label={label}
      title={label}
      style={{ flex: "none" }}
      {...props}
      onClick={async () => {
        const url = `${location.origin}${path}`;
        if (await copyText(url)) return toast("여행 링크를 복사했어요");
        if (navigator.share) {
          try {
            return await navigator.share({ url });
          } catch {
            /* 공유 창을 닫음 — 아래 안내로 */
          }
        }
        toast.error(`복사하지 못했어요. 이 링크를 길게 눌러 복사해 주세요: ${url}`);
      }}
    >
      <Share2 aria-hidden size={18} />
    </ActionIcon>
  );
}
