# src/lib/ — 도메인 로직 · 서버 데이터 계층

## 구조

| 경로 | 내용 | 실행 위치 |
|---|---|---|
| `domain/` | 정산·트리맵·날짜·표시 문구·몰빵 게임·날씨 코드표(`weather.ts`)·주소 지역 추출(`address.ts`) **순수 함수** + `*.test.ts` | 어디서나 |
| `trips/schema.ts` | zod 입력 검증 — 화면(즉시 안내)과 Server Action(최종 검증)이 **같이** 쓴다. 안내 문구·상한(`MAX_*`)도 여기 | 어디서나 |
| `trips/actions.ts` | Server Actions (`"use server"`) — 모든 변경의 유일한 입구 | 서버 |
| `trips/queries.ts` | 조회 — `getTripBySlug`(React `cache()` 로 요청당 1회), `listTrips`(뷰 `trip_summaries`), `getTripCoords`(날씨 새로고침) | 서버(`server-only`) |
| `trips/mapping.ts` | DB 행 → `TripData`. **정렬을 여기서 확정**(멤버 `sort_order`, 지출 최신순) | 어디서나 |
| `trips/slug.ts` | 여행 링크 slug 생성·검증 (12자 영숫자, DB check 와 형식 일치) | 어디서나 |
| `supabase/server.ts` · `browser.ts` | 서버 클라이언트(secret key) / 브라우저 클라이언트(publishable key — Realtime 전용) | |
| `weather/open-meteo.ts` | 숙소 **지금 날씨**(Open-Meteo `current`, 키 없음). 첫 화면 5분 데이터 캐시, 새로고침은 `fresh`(no-store) | 서버 |
| `weather/geocode.ts` | 숙소 주소 → 좌표 (NCP Maps Geocoding, `NAVER_MAPS_API_KEY_ID`·`_KEY`). 0건이면 `addressRegion` 으로 재시도 | 서버 |
| `weather/actions.ts` | `refreshWeather(slug)` — 날씨 새로고침(읽기 전용 Server Action) | 서버 |
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
- 설정 화면은 `saveSettings` 하나로 여행 정보·멤버 추가·빼기·색을 **한 트랜잭션**(DB 함수 `save_trip_settings`)에 저장한다. 멤버 개별 추가·빼기 액션은 없다.
- **숙소 좌표는 `saveSettings` 가 DB 함수 저장 뒤에 따로 채운다**(`fillCoords`) — **여행 정보(이름·날짜·주소)를 함께 저장할 때만**, 주소가 바뀌었거나 주소는 있는데 좌표가 없으면 지오코딩.
  멤버만 바꾼 저장(`trip: null`)은 건드리지 않는다 — 좌표 없는 기존 여행은 여행 정보를 한 번 저장해야 채워진다. 저장 전 주소 읽기가 실패하면 좌표만 건너뛴다.
  그사이 다른 저장으로 주소가 또 바뀌었으면 `address = 지오코딩한 주소` 조건에 걸려 쓰지 않는다. 지오코딩·좌표 쓰기가 실패해도 저장은 성공(좌표만 비고 날씨 줄이 숨는다).
  틀린 번지는 NCP 가 0건이라 지역(읍·면·동까지 / 없으면 시·군·구까지)으로 다시 찾는다 — 날씨는 동네 단위면 된다는 결정(2026-10-07, 사용자 확인).
- **외부 API(날씨·지오코딩)는 실패해도 예외를 올리지 않고 `null`** — 정산·지출 화면은 외부 서비스와 무관하게 떠야 한다. 키가 없으면 호출하지 않는다(CI 는 키 없이 돈다).
- 날씨는 Open-Meteo 현재 값이 **15분 간격**이라 새로고침해도 값이 그대로일 때가 많다 → 화면이 "새로 받았어요 · HH:MM 기준" 알림을 띄운다.
  Next 데이터 캐시는 만료 뒤 첫 요청에 옛 값을 주므로(stale-while-revalidate) 새로고침은 `revalidate` 가 아니라 `cache: "no-store"`.
- `refreshWeather` 는 좌표를 인자로 받지 않고 slug 로 DB 에서 읽는다 — 아무 좌표나 조회해 주는 통로가 되지 않게. 인증 전이라 연타 제한은 없다(문제되면 여기서).
- 새 액션은 `run(slug, fn, dbMessages)` 로 감싼다 — 오류 문구 변환·`refresh()`·변경 신호가 여기서 일괄 처리된다.
- "읽고 → 계산 → 넣기"(개수 제한, 다음 순서 번호)는 앱에서 하지 않고 DB 함수로 원자적으로 한다 (`supabase/CLAUDE.md`).
- "오늘"은 `todayIn("Asia/Seoul")` — 서버(Vercel)가 UTC 라 그냥 `new Date()` 면 자정 전후 D-day 가 하루 어긋난다.
- `refresh()`(next/cache)는 **Server Action 안에서만** 쓸 수 있다. `revalidatePath` 는 지금 "방문했던 모든 페이지 갱신" 동작이라 쓰지 않았다.
- 저장한 화면도 자기 신호를 받아 한 번 더 새로 받는다 — 알고 둔 단순화. 줄이려면 탭 id 를 액션에 실어 신호 payload 로 거른다.
- `domain/game.ts` 의 사다리는 원형 아티팩트의 버그(빈 칸 보충 실패 → 일부끼리 절대 안 섞임)를 고친 버전이다. 테스트 5,000회가 이를 고정한다.
