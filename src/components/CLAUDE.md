# src/components/ — 화면

## 구조

| 경로 | 내용 |
|---|---|
| `trip/trip-app.tsx` | 여행 화면 루트(클라이언트) — 탭·지출 추가 버튼·시트 상태. 데이터는 서버 props, 바뀌면 `refresh()` 로 새 props |
| `trip/parts.tsx` | 공용 부품: `Avatar`·`CategoryDot`·`Chip`·`ArmedButton`(두 번 누르기)·`copyText`/`CopyFallback`·`useAction`, 버튼·입력 클래스 |
| `trip/*-tab.tsx`, `expense-sheet.tsx`, `ticket.tsx`, `treemap.tsx` | 탭별 화면, 지출 입력 시트(shadcn Drawer), 여행 티켓, 트리맵 |
| `trip/use-live-updates.ts` | 다른 화면 변경 신호 구독 → `router.refresh()` (재연결·탭 다시 보일 때도) |
| `game/` | 몰빵 게임 — `game-tab`(미션·참가자·결과) + 룰렛·사다리·폭탄·카드 |
| `form/` | `DatePicker`·`DateRangePicker`(Calendar+Popover, `ko`), `OptionSelect`(Select) |
| `trips/`, `home/`, `app-header.tsx` | 여행 목록, 새 여행 폼, 공통 헤더 |
| `ui/` | **shadcn 생성물** — 직접 고치기보다 감싸서 쓴다. `import { cn } from "cn"` 은 shadcn 의 npm 패키지(정상) |

## 규칙·함정

- **폼은 다른 화면의 변경으로 props 가 바뀌어도 맞아야 한다**(실시간 갱신). 처음 props 로 `useState` 를 한 번 채우고 끝내면
  남의 변경을 덮어쓰거나(lost update) 지워진 대상을 새로 만든다(코드 리뷰 지적). 패턴:
  - 고치는 대상은 **처음 연 id 로 고정**하고, 대상이 사라졌으면 저장을 막는다 (`expense-sheet.tsx`)
  - 사용자가 **고친 칸만 상태로** 들고 나머지는 지금 props 를 보여 준다 (`settings-tab.tsx` `TripForm`)
  - "전원" 같은 기본값은 안 건드렸으면 지금 데이터를 따라가고, 빠진 멤버는 걸러 낸다
  - 판·결과처럼 특정 상태에 속한 값은 그 상태의 key 에 묶는다 (`game-tab.tsx` `outcome`)
- **애니메이션은 rAF 로 DOM 을 직접 고치고, 렌더에는 "멈춤/도착" 값만 쓴다** (룰렛 `rest`, 사다리 `arrived`).
  React 는 바뀐 속성만 DOM 에 쓰므로 도는 중 다시 그려져도 튀지 않는다. 렌더 중 `ref.current` 읽기는 lint(`react-hooks/refs`)가 막는다.
- `ArmedButton`(두 번 누르기)은 **폭이 바뀌지 않게** 둔다 — 문구가 길어졌다 3초 뒤 줄어들면 옆 링크가 손가락 밑으로 와서 잘못 누른다(실측 발생, `trip-list.tsx`).
- Tailwind 는 클래스를 정적으로 찾는다 — `bg-${x}` 같은 조합 대신 `parts.tsx` 의 목록(`MEMBER_BG`·`CATEGORY_BG`)을 쓴다.
- 브라우저 점검 함정: Chrome 탭이 **hidden** 이면 rAF·CSS 전환이 멈춘다. 시트가 덜 올라온 채로 클릭해 닫히거나 사다리가 안 끝나는 것처럼 보이면 코드보다 탭 상태를 먼저 의심한다.
