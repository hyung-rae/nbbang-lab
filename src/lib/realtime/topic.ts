// 여행 변경 신호 채널. 서버가 변경 후 "changed" 를 보내면, 그 여행 화면을 연 브라우저들이 새로 받아 온다.
// 신호에는 데이터를 싣지 않는다 — 브라우저는 신호만 받고 데이터는 서버에서 다시 읽는다 (DB 는 서버만 접근).

export const TRIP_CHANGED = "changed";

export function tripTopic(slug: string): string {
  return `trip:${slug}`;
}
