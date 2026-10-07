# src/lib/ — 도메인 로직 · 서버 데이터 계층

## 구조

| 경로 | 내용 | 실행 위치 |
|---|---|---|
| `domain/` | 정산·트리맵·날짜·표시 문구·몰빵 게임 **순수 함수** + `*.test.ts` | 어디서나 |
| `trips/schema.ts` | zod 입력 검증 — 화면(즉시 안내)과 Server Action(최종 검증)이 **같이** 쓴다. 안내 문구·상한(`MAX_*`)도 여기 | 어디서나 |
| `trips/actions.ts` | Server Actions (`"use server"`) — 모든 변경의 유일한 입구 | 서버 |
| `trips/queries.ts` | 조회 — `getTripBySlug`(React `cache()` 로 요청당 1회), `listTrips`(뷰 `trip_summaries`) | 서버(`server-only`) |
| `trips/mapping.ts` | DB 행 → `TripData`. **정렬을 여기서 확정**(멤버 `sort_order`, 지출 최신순) | 어디서나 |
| `trips/slug.ts` | 여행 링크 slug 생성·검증 (12자 영숫자, DB check 와 형식 일치) | 어디서나 |
| `supabase/server.ts` · `browser.ts` | 서버 클라이언트(secret key) / 브라우저 클라이언트(publishable key — Realtime 전용) | |
| `realtime/` | 여행 변경 신호 채널 `trip:<slug>` / `changed` (`notify.ts` 는 서버 전용) | |
| `site.ts` | 앱 이름("엔빵")·설명·사이트 주소 | |

## 데이터 흐름

화면 → Server Action → `check(schema, input)` → `tripIdOf(slug)` → 대상 행을 `.eq("trip_id", tripId)` 로 묶어 변경
→ `refresh()`(이 화면 새로 받기) → `after(() => notifyTripChanged(slug))`(응답 뒤 다른 화면에 신호)
→ 다른 화면 `components/trip/use-live-updates.ts` 가 신호를 받아 `router.refresh()`.

## 규칙·함정

- **정산은 `domain/settle.ts` 하나뿐이다.** 화면에서 금액을 다시 계산하지 않는다. 원형 아티팩트 `settle()` 과 무작위 2,000개 여행으로 1원까지 같음을 확인했고,
  `settle.test.ts` 의 불변식(잔액 합 0 · 송금 적용 후 전원 0 · 덤탱이 외 100원 단위)이 그 보증이다.
- 나머지 1원 배분 순서는 `split` 배열 순서가 아니라 **멤버 순서**(`splitMembers`)다.
- Server Action 은 화면 밖에서 POST 로도 불린다 → 인자는 타입을 믿지 말고 검증한다(slug 도 `unknown` 취급), 배열 입력에는 상한을 둔다.
  권한 검사가 생기면 `tripIdOf` 에 넣는다.
- 새 액션은 `run(slug, fn, dbMessages)` 로 감싼다 — 오류 문구 변환·`refresh()`·변경 신호가 여기서 일괄 처리된다.
- "읽고 → 계산 → 넣기"(개수 제한, 다음 순서 번호)는 앱에서 하지 않고 DB 함수로 원자적으로 한다 (`supabase/CLAUDE.md`).
- "오늘"은 `todayIn("Asia/Seoul")` — 서버(Vercel)가 UTC 라 그냥 `new Date()` 면 자정 전후 D-day 가 하루 어긋난다.
- `refresh()`(next/cache)는 **Server Action 안에서만** 쓸 수 있다. `revalidatePath` 는 지금 "방문했던 모든 페이지 갱신" 동작이라 쓰지 않았다.
- 저장한 화면도 자기 신호를 받아 한 번 더 새로 받는다 — 알고 둔 단순화. 줄이려면 탭 id 를 액션에 실어 신호 payload 로 거른다.
- `domain/game.ts` 의 사다리는 원형 아티팩트의 버그(빈 칸 보충 실패 → 일부끼리 절대 안 섞임)를 고친 버전이다. 테스트 5,000회가 이를 고정한다.
