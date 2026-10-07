import { notifications } from "@mantine/notifications";

/** 짧은 알림. sonner 의 toast/toast.error 와 같은 모양으로 불러 쓴다 */
export const toast = Object.assign((message: string) => notifications.show({ message, autoClose: 2400 }), {
  error: (message: string) => notifications.show({ message, color: "red", autoClose: 4000 }),
});
