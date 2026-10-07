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
| `music/chips.ts` · `songs.ts` | 음악 탭 칩(시대 5 × 테마 13 = 65칸)·검색어·캐시 키, 재생목록 영상 → 노래 거르기·뽑기 **순수 함수** | 어디서나 |
| `music/youtube.ts` | YouTube 재생목록 검색 → 곡 목록 → 길이·채널 (`YOUTUBE_API_KEY`) | 서버 |
| `music/actions.ts` | `getSongs({ era, theme })` — 칸 캐시(`music_cache`) 우선, 노래 후보 반환 | 서버 |
| `auth/token.ts` | 관리자 세션 서명·검증(HMAC, 30일), 비밀번호 비교, 실패 횟수 제한 **순수 함수** | 서버(node:crypto) |
| `auth/admin.ts` | `isAdmin()` — 쿠키 `nb_admin` 확인, `adminConfig()` (`ADMIN_PASSWORD`·`ADMIN_SESSION_SECRET`) | 서버(`server-only`) |
| `auth/actions.ts` | `login(password)`·`logout()` | 서버 |
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
- **권한 (2026-10-07)**: 참여자는 로그인 없이 "slug 를 안다 = 편집"(지출·장보기·덤탱이). **새 여행·여행 삭제·설정은 관리자만** —
  `createTrip`·`deleteTrip`·`saveSettings` 가 `requireAdmin()`/`isAdmin()` 으로 서버에서 거절한다. 화면 숨김(설정 탭·휴지통·새 여행 폼)은 편의일 뿐.
  관리자용 액션을 새로 만들면 같은 확인을 넣는다.
- **관리자 세션**: 쿠키 = "만료시각.HMAC"(httpOnly·Lax·30일), 비밀번호는 쿠키에 없다. `ADMIN_SESSION_SECRET` 을 바꾸면 모든 기기 로그아웃.
  비밀번호 틀림은 0.5초 지연 + 같은 IP(`x-real-ip` 우선) 10분 5회 제한(서버 메모리라 완전하지 않음 → 긴 비밀번호). 키가 없으면 관리자 기능만 잠긴다.
  **로그아웃은 그 브라우저 쿠키만 지운다** — 서버에 세션 목록이 없어서, 쿠키 값이 새어 나갔다면 `ADMIN_SESSION_SECRET` 을 바꾸고 Redeploy 해야 끊긴다.
- **`isAdmin()` 은 설정이 없어도 쿠키를 먼저 읽는다** — 일찍 return 하면 키 없는 빌드에서 홈·로그인 페이지가 정적으로 굳어 관리자 화면이 안 나온다(빌드 표에서 ƒ 확인).
- 설정 화면은 `saveSettings` 하나로 여행 정보·멤버 추가·빼기·색을 **한 트랜잭션**(DB 함수 `save_trip_settings`)에 저장한다. 멤버 개별 추가·빼기 액션은 없다.
- **숙소 좌표는 `saveSettings` 가 DB 함수 저장 뒤에 따로 채운다**(`fillCoords`) — **여행 정보(이름·날짜·주소)를 함께 저장할 때만**, 주소가 바뀌었거나 주소는 있는데 좌표가 없으면 지오코딩.
  멤버만 바꾼 저장(`trip: null`)은 건드리지 않는다 — 좌표 없는 기존 여행은 여행 정보를 한 번 저장해야 채워진다. 저장 전 주소 읽기가 실패하면 좌표만 건너뛴다.
  그사이 다른 저장으로 주소가 또 바뀌었으면 `address = 지오코딩한 주소` 조건에 걸려 쓰지 않는다. 지오코딩·좌표 쓰기가 실패해도 저장은 성공(좌표만 비고 날씨 줄이 숨는다).
  틀린 번지는 NCP 가 0건이라 지역(읍·면·동까지 / 없으면 시·군·구까지)으로 다시 찾는다 — 날씨는 동네 단위면 된다는 결정(2026-10-07, 사용자 확인).
- **외부 API(날씨·지오코딩)는 실패해도 예외를 올리지 않고 `null`** — 정산·지출 화면은 외부 서비스와 무관하게 떠야 한다. 키가 없으면 호출하지 않는다(CI 는 키 없이 돈다).
- 날씨는 Open-Meteo 현재 값이 **15분 간격**이라 새로고침해도 값이 그대로일 때가 많다 → 화면이 "새로 받았어요 · HH:MM 기준" 알림을 띄운다.
  Next 데이터 캐시는 만료 뒤 첫 요청에 옛 값을 주므로(stale-while-revalidate) 새로고침은 `revalidate` 가 아니라 `cache: "no-store"`.
- `refreshWeather` 는 좌표를 인자로 받지 않고 slug 로 DB 에서 읽는다 — 아무 좌표나 조회해 주는 통로가 되지 않게. 인증 전이라 연타 제한은 없다(문제되면 여기서).
- 키 없는 지오코딩 대안(2026-10-07 실측): Open-Meteo 지오코딩은 한국 시·군·구를 자주 못 찾고(속초시·해운대구 0건) 엉뚱한 곳을 준다 — 쓰지 않는다.
  Nominatim(OSM)은 표본 5건 모두 맞았다 — NCP 를 그만 쓰게 되면 후보(초당 1회·앱 이름 User-Agent·OSM 출처 표기 필요).
- **음악은 재생목록 방식이다** — 영상 검색은 결과 대부분이 1~10시간 노래 모음이라 못 쓴다(2026-10-07 실측). `search(type=playlist)` 1회 → 상위 3개 재생목록의 곡 →
  1분30초~8분·공식 음원(`… - Topic`) 우선·가수당 1곡. 공식 음원이 모자라면 일반 영상으로 보충하되 가수 칸은 비운다(채널 = 올린 사람). 제목은 엔티티 디코드만(YouTube 정책: 검색 결과 글자를 바꾸지 않는다).
- **YouTube 쿼터: `search.list` 는 하루 100회 전용 한도**(나머지 호출은 1만 단위 공용). 그래서 검색 단위를 칩 칸(65개)으로 묶고 칸마다 7일 캐시 —
  `getSongs` 는 칩 값만 받는다(칸 65개). 성공한 칸은 7일 동안 다시 안 부르고, **실패·빈 결과는 캐시하지 않는 대신 그 칸을 10분 쉰다**(실패가 매번 검색 한도를 쓰지 않게),
  같은 칸 동시 요청은 하나로 묶는다 — 둘 다 서버 인스턴스 메모리라 완전한 상한은 아니다. 캐시 읽기가 실패하면 YouTube 로 가지 않는다.
  API 가 실패하면 옛 캐시를 쓰되 **30일 넘은 값은 쓰지 않는다**(정책 III.E.4). 재생목록 3개 중 일부가 비공개·삭제여도 나머지로 간다.
  거르는 규칙을 바꾸면 `cellKey` 판 번호를 올린다 — **개발 서버와 프로덕션이 같은 DB 캐시를 쓴다.**
- 음악 칩은 **상황과 장르를 함께 고르지 못하게** 했다 — 같이 넣은 검색어("드라이브 밴드")는 상위 재생목록이 한쪽(주로 상황)만 맞아 장르가 흐려진다(실측, 사용자 결정).
- **브라우저 없이 Server Action 확인하기**(W-007 — 화면 실측은 사용자): 개발 서버에서 그 페이지를 한 번 연 뒤
  `.next/dev/server/app/<경로>/page/server-reference-manifest.json` 에서 `exportedName` 으로 액션 id 를 찾아
  `curl -X POST <페이지 주소> -H "Next-Action: <id>" -H "Accept: text/x-component" --data '[인자들 JSON]'` — 응답의 `1:{…}` 줄이 결과다.
  지우기·쓰기 액션의 가드를 볼 때는 **없는 slug·빈 입력**으로 부른다(가드가 뚫려도 아무것도 안 바뀌게).
- 새 액션은 `run(slug, fn, dbMessages)` 로 감싼다 — 오류 문구 변환·`refresh()`·변경 신호가 여기서 일괄 처리된다.
- "읽고 → 계산 → 넣기"(개수 제한, 다음 순서 번호)는 앱에서 하지 않고 DB 함수로 원자적으로 한다 (`supabase/CLAUDE.md`).
- "오늘"은 `todayIn("Asia/Seoul")` — 서버(Vercel)가 UTC 라 그냥 `new Date()` 면 자정 전후 D-day 가 하루 어긋난다.
- `refresh()`(next/cache)는 **Server Action 안에서만** 쓸 수 있다. `revalidatePath` 는 지금 "방문했던 모든 페이지 갱신" 동작이라 쓰지 않았다.
- **Realtime 신호 채널은 공개 채널이다** — publishable 키만 있으면 누구나 `trip:<slug>` 를 구독·전송할 수 있다. 신호에 데이터가 없고 가짜 신호는 `router.refresh()` 만 일으켜 무해하다고 보고 둔다.
  권한을 더 조이게 되면 private channel 을 검토한다.
- 저장한 화면도 자기 신호를 받아 한 번 더 새로 받는다 — 알고 둔 단순화. 줄이려면 탭 id 를 액션에 실어 신호 payload 로 거른다.
- `domain/game.ts` 의 사다리는 원형 아티팩트의 버그(빈 칸 보충 실패 → 일부끼리 절대 안 섞임)를 고친 버전이다. 테스트 5,000회가 이를 고정한다.
