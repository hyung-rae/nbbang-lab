import { notifications } from "@mantine/notifications";
import { Check, CircleAlert } from "lucide-react";
import { createElement } from "react";

// 눈에 띄게: 알림 색(--notification-color)으로 칠한 바탕 + 흰 글자 + 아이콘 (2026-10-07 사용자 지시).
// 인라인 styles 라서 Mantine 기본 규칙과의 CSS 순서와 상관없이 이긴다
const styles = {
  root: { backgroundColor: "var(--notification-color)", borderRadius: "var(--mantine-radius-lg)", paddingBlock: 12 },
  icon: { backgroundColor: "rgb(255 255 255 / 0.22)" },
  description: { color: "var(--mantine-color-white)", fontWeight: 600, fontSize: "var(--mantine-font-size-sm)" },
};

/** 짧은 알림. sonner 의 toast/toast.error 와 같은 모양으로 불러 쓴다. 닫기 버튼 없이 시간이 지나면 사라진다 */
export const toast = Object.assign(
  (message: string) =>
    notifications.show({ message, autoClose: 2400, withCloseButton: false, icon: createElement(Check, { size: 16 }), styles }),
  {
    error: (message: string) =>
      notifications.show({
        message,
        color: "red",
        autoClose: 4000,
        withCloseButton: false,
        icon: createElement(CircleAlert, { size: 16 }),
        styles,
      }),
  },
);
