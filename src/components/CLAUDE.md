# src/components/ — 화면

## 구조

| 경로 | 내용 |
|---|---|
| `trip/trip-app.tsx` | 여행 화면 루트(클라이언트) — 탭·지출 추가 버튼·시트 상태. 데이터는 서버 props, 바뀌면 `refresh()` 로 새 props |
| `trip/parts.tsx` | 공용 부품: `Avatar`·`CategoryDot`·`Chip`·`SectionTitle`·`Empty`·`TrashButton`/`DeleteConfirm`(삭제 확인 창)·`copyText`/`CopyFallback`·`useAction`, 색 `memberColor`·`categoryColor`·`filledColor`·`INK_ON_FILLED`(칠한 색 위 글자는 노랑·라임도 흰색 — 2026-10-07 사용자 결정) |
| `trip/*-tab.tsx`, `expense-sheet.tsx`, `ticket.tsx`, `treemap.tsx` | 탭별 화면, 지출 입력 시트(Mantine `Drawer` 아래쪽), 여행 티켓, 트리맵 |
| `trip/ticket.tsx` 숙소 패널 | 주소 줄 + 오른쪽 아이콘 [주소 복사][네이버 지도][카카오맵], 둘째 줄 **지금 날씨**(`☁️ 흐림 18° · 체감 16°` / `HH:MM 기준 · Open-Meteo` / [↻]). 주소 없으면 패널째 숨김 |
| `trip/use-live-updates.ts` | 다른 화면 변경 신호 구독 → `router.refresh()` (재연결·탭 다시 보일 때도) |
| `music/music-tab.tsx` | 음악 탭 — 시대(선택)·테마(필수, 상황·장르 중 하나) 칩 → `getSongs` 후보 중 7곡, [다시 뽑기]는 화면에서만(재호출 없음). 제목 옆 YouTube 아이콘(출처), 곡 줄은 썸네일 + 제목 · 가수, **누르는 곳 없음**(사용자 결정). 저장 없음, 멤버 없어도 보임 |
| `game/` | 몰빵 게임 — `game-tab`(미션·참가자·결과) + 룰렛·사다리·폭탄·카드 |
| `form/` | `DatePicker`·`DateRangePicker`(Mantine `DatePickerInput`, `ko`·일요일 시작), `OptionSelect`(Mantine `Select`) |
| `trips/`, `home/`, `app-header.tsx` | 여행 목록, 새 여행 폼, 공통 헤더 |
| `page-shell.tsx`, `link-button.tsx`, `notify.ts`, `list.module.css` | 화면 틀(가운데 36rem), 버튼 모양 링크, 알림 `toast`/`toast.error`, 카드 안 목록 줄 스타일 |
| `page-loader.tsx` | 화면 이동 로딩(가운데 아이콘 + 도는 원). `app/loading.tsx`(데이터 기다리는 동안) + `app/template.tsx`(첫 경로가 바뀌는 이동 직후 1초 덮기, 타이밍은 CSS — 서버 지연은 `refresh()` 까지 느려져서 안 씀. `/t/a`→`/t/b` 는 안 덮음). 루트 loading 이라 없는 여행 링크도 200(+noindex) |

## 스타일 체계 (Mantine 9, 2026-10-07 shadcn·Tailwind 에서 전면 교체)

- **Mantine 기본 테마 + 포인트 색 teal + 글꼴 IBM Plex Sans KR** (`src/theme.ts`). 다크 모드는 `defaultColorScheme="auto"`(시스템 설정).
- 배치·여백·글자는 **Mantine 컴포넌트와 style props**(`p`·`gap`·`c`·`fw` …), 직접 그리는 부분(티켓·트리맵·게임·탭바)은 **같은 폴더의 `*.module.css`** 에
  Mantine 변수(`var(--mantine-…)`)로 쓴다. 전역 CSS 는 `app/globals.css` 몇 줄뿐 — 바탕 `--app-bg`·숫자 `tabular-nums`·한글 `keep-all`.
- 색은 Mantine 팔레트 이름으로: 멤버 12색(DB `members.color` 0~11, 앞 6색 순서 고정)·지출 분류 7색 → `parts.tsx` `memberColor`·`categoryColor`. 칠할 값은 `filledColor()`(CSS 변수).
- 크기는 테마 기본값 `size="sm"`, 버튼 둥글기 `md` (2026-10-07 사용자 결정). 입력칸 글자만 16px(iOS 확대 방지) — `theme.ts`.

## 규칙·함정

- **폼은 다른 화면의 변경으로 props 가 바뀌어도 맞아야 한다**(실시간 갱신). 처음 props 로 `useState` 를 한 번 채우고 끝내면
  남의 변경을 덮어쓰거나(lost update) 지워진 대상을 새로 만든다(코드 리뷰 지적). 패턴:
  - 고치는 대상은 **처음 연 id 로 고정**하고, 대상이 사라졌으면 저장을 막는다 (`expense-sheet.tsx`)
  - 사용자가 **고친 칸만 상태로** 들고 나머지는 지금 props 를 보여 준다 (`settings-tab.tsx` `SettingsForm` — 여행 정보 고친 칸·뺄 멤버·바꾼 색·새 멤버를 모아 [저장] 한 번)
  - "전원" 같은 기본값은 안 건드렸으면 지금 데이터를 따라가고, 빠진 멤버는 걸러 낸다
  - 판·결과처럼 특정 상태에 속한 값은 그 상태의 key 에 묶는다 (`game-tab.tsx` `outcome`)
- **애니메이션은 rAF 로 DOM 을 직접 고치고, 렌더에는 "멈춤/도착" 값만 쓴다** (룰렛 `rest`, 사다리 `arrived`).
  React 는 바뀐 속성만 DOM 에 쓰므로 도는 중 다시 그려져도 튀지 않는다. 렌더 중 `ref.current` 읽기는 lint(`react-hooks/refs`)가 막는다.
- **모든 삭제·빼기는 `DeleteConfirm`(확인 창)** 을 거친다 (2026-10-07 사용자 지시 — 예전 "두 번 누르기" `ArmedButton` 은 없앰).
  목록 줄은 `TrashButton`(휴지통 아이콘), 지출 고치기 시트는 아래 [삭제하기]·[고치기] (닫기는 X, 추가 시트는 [취소]·[추가]).
  확인 창 첫 포커스는 취소 버튼(Enter 로 실수 삭제 방지). 대상과 `opened` 를 따로 들어 닫히는 동안에도 문구가 남게 한다.
- **Mantine 함정** (전환하며 겪은 것):
  - style prop 에 `bg="teal.filled"` 처럼 `색.filled` 를 넘기면 SSR 이 500 (`reading 'startsWith'`) — `filledColor()` / `var(--mantine-color-teal-filled)` 를 쓴다.
  - 서버 컴포넌트에서는 `Popover.Target` 같은 점 표기가 안 된다(Mantine 문서). 컴포넌트를 prop 으로 넘기는 `Button component={Link}` 도
    서버→클라이언트 경계를 넘기지 않으려고 `LinkButton`(클라이언트 파일)으로 감쌌다.
    `theme.ts` 의 `components` 도 `.extend()` 대신 평범한 객체(서버 파일 layout 에서 import).
  - `Chip` 은 children 을 block `span` 으로 감싼다 → 아바타+이름은 안쪽을 `Group component="span"` 으로 한 번 더 감싼다 (`parts.tsx`).
  - `Group` 은 `component="form"` 타입이 안 맞는다 — `<form>` 안에 `Group` 을 둔다 (`Paper`·`Box`·`Stack` 은 된다).
  - `Notifications` 에 `style` 을 주면 **위치별 컨테이너 6개 모두**에 붙는다 — `bottom` 을 주면 top-center 컨테이너가 화면을 덮어 클릭을 가로챈다.
    `app/notifications.module.css` 처럼 `[data-position=…]` 으로 한 곳만 고친다.
  - 아래쪽 `Drawer` 는 `size="auto"` 여도 화면 높이까지 늘어난다 → `styles.content` 에 `height: auto`·`flex: 0 0 auto`. 열릴 때 포커스는 `data-autofocus` 칸으로.
  - 아래쪽 시트를 끌어내려 닫는 동작은 없다(바깥·X·Esc).
  - **`DatePickerInput type="range"`** (코드 리뷰·실측): 첫 클릭의 `[d, null]` 을 부모에 `end = start` 로 올리면 제어 값이 `[d, d]` 로 돌아와 범위가 끝난다
    → "고르는 중"은 `DateRangePicker` 안에서만 든다. 또 닫힐 때 `popoverProps.onClose` **다음에** 반쪽 범위를 `[null, null]` 로 비우므로,
    시작일만 고르고 닫은 하루짜리 여행이 지워지지 않게 그 한 번을 무시한다(`closing` ref).
  - `Popover` 기본값은 `trapFocus: false` — 고르는 팝오버(색 팔레트)는 `trapFocus returnFocus` + 현재 값에 `data-autofocus` 를 줘야 키보드로 쓸 수 있다.
  - `Drawer`·`Modal` 의 X 에는 기본 `aria-label` 이 없다 → `closeButtonProps={{ "aria-label": "닫기" }}`.
  - 창 위에 창(시트 위 삭제 확인)을 띄우면 **Esc 한 번에 둘 다 닫힌다** — 열린 창마다 window 에서 Esc 를 듣기 때문(실측).
    위 창이 떠 있는 동안 아래 창에 `closeOnEscape={false}`·`closeOnClickOutside={false}` (`expense-sheet.tsx` `confirming`).
- **티켓 날씨 줄은 서버가 기다리지 않고 넘긴 Promise 를 `<Suspense>` + `use()` 로 읽는다** (`page.tsx` → `TripApp` → `Ticket`).
  날씨가 늦어도 티켓·탭은 먼저 뜬다. 새로고침 값은 티켓 안 상태로 들고, 실시간 갱신으로 서버 값이 새로 오면 관측 시각이 더 최근인 쪽을 보여 준다(`newerWeather`).
- 음악 탭 썸네일은 저장하지 않고 영상 id 로 주소를 만든다(`thumbUrl`). `next/image` **`unoptimized`** — 브라우저가 `i.ytimg.com` 에서 바로 받아
  Vercel 이미지 최적화 한도를 쓰지 않고 `remotePatterns` 도 필요 없다.
- 음악 탭 칩을 연달아 누르면 요청 번호(`useRef`)로 마지막 조건의 결과만 보여 주고, 캐시가 바로 와도 0.7초는 "노래 고르는 중…"을 보인다.
- 지도 로고는 `public/brands/*-map.png`(사용자 제공 앱 아이콘, 144px) + `next/image`. **같은 파일 이름으로 덮어쓰면 next/image·브라우저 캐시가 옛 그림을 계속 낸다**(실측) — 로고를 바꿀 땐 이름을 바꾼다.
  Open-Meteo 는 CC BY 4.0 이라 출처를 화면 글자로 표기한다(기준 시각 옆 링크).
- 브라우저 점검 함정: Chrome 탭이 **hidden**(`document.visibilityState`)이면 rAF·CSS 전환이 멈춘다. Mantine `Drawer`·`Popover` 는 전환이 rAF 라 **아예 안 열린 것처럼** 보이고,
  사다리가 안 끝나는 것처럼 보인다 — 코드보다 탭 상태를 먼저 의심한다.
