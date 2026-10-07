# nbbang-lab 용어사전 (glossary)

**목적** — 사람이 쓰는 말과 코드 식별자를 잇는다.
nbbang-lab 은 **Claude 아티팩트로 먼저 만든 친구 여행 가계부를 웹 애플리케이션 "엔빵"으로 옮긴 프로젝트**라서,
같은 개념이 아티팩트판과 웹앱판에서 다르게 구현될 수 있다. 이 차이가 대화에서 가장 자주 어긋난다.

**사용법**

```bash
grep -n "^### " .claude/glossary.md                   # 전체 목록
grep -n -A6 "^### 덤탱이" .claude/glossary.md          # 특정 용어 상세
grep -n -B2 -A6 "taker" .claude/glossary.md           # 코드 식별자로 역검색
```

- 작업 계획·이슈 논의 시 사전에 있는 용어는 그 표기를 쓴다. 없는 용어를 새로 쓰면 등록을 제안한다.
- 등록·수정은 `/term`. 식별자는 **웹앱 코드 기준**이다. 아직 구현되지 않은 것만 `(명세)` 로 표시한다.
- 명세 원본: dev-wiki `여행 가계부 작업 계획.md`, 아티팩트 (링크 비공개 — git 밖 private-docs 참고)

> `CLAUDE.md` 와 충돌하면 **`CLAUDE.md`가 우선**한다. 충돌을 발견하면 사용자에게 알린다.

---

## 0. 앱

### 엔빵 (SITE_NAME)
- **코드 식별자**: `SITE_NAME` (`src/lib/site.ts`), 메타데이터 `src/app/layout.tsx`
- **정의**: 이 웹앱의 이름 (2026-10-06 사용자 지정). 부제 "친구 여행 가계부".
- **혼동 주의**: **"N빵"(균등 분할, 아래 A절)과 다르다.** "엔빵 화면" = 앱, "N빵 계산" = `splitEven`. 저장소 이름은 `nbbang-lab`.

## A. 정산

### N빵 (split)
- **코드 식별자**: `Expense.split`, `splitEven()`·`splitMembers()` (`src/lib/domain/settle.ts`), DB `expense_splits`
- **정의**: 한 지출을 같이 나눌 멤버들끼리 균등 분할하는 것. 나머지 원은 멤버 순서상 앞사람부터 1원씩 더 낸다.
- **별칭**: 더치페이, 같이 나눌 사람
- **혼동 주의**: `split` 은 멤버 id **목록**이지 금액이 아니다. 전원이 아닐 수 있다(혼자 부담·일부 N빵).
  나머지 1원 배분 순서는 `split` 배열 순서가 아니라 **멤버 순서**(`members.sort_order`)다.

### 낸 돈 / 쓴 돈 / 잔액 (paid / owed / bal)
- **코드 식별자**: `Settlement.paid`·`owed`·`bal` (`settle()`)
- **정의**: 낸 돈 = 직접 결제한 합계, 쓴 돈 = N빵으로 나눈 내 몫, 잔액 = 낸 돈 − 쓴 돈. 양수면 받을 돈, 음수면 보낼 돈.
- **혼동 주의**: 100원 단위 정리 **후**의 `owed` 는 `paid − bal` 로 다시 계산된 값이라 N빵 원값과 다르다.

### 덤탱이 쓸 사람 (taker)
- **코드 식별자**: 저장 `TripData.takerId` / DB `trips.taker_member_id`, 계산 결과 `Settlement.taker`, 결정 `resolveTaker()`
- **정의**: 송금을 100원 단위로 끊고 남는 끝전을 몰아서 떠안는 멤버. 나머지는 모두 유리하게(보낼 돈 내림·받을 돈 올림) 정리된다.
- **별칭**: 덤탱이. **화면 표기는 "좀 더 착한 사람"** (2026-10-07 사용자 지시 — 정산 카드 제목·알림·정산 복사 문구). 코드·문서에서는 덤탱이로 부른다.
- **혼동 주의**: 지정하지 않았거나 없는 멤버면 **가장 많이 받을 사람**이 자동으로 맡는다 — 그래서 `takerId`(저장값, null 가능)와 `taker`(실제로 맡은 사람)가 다를 수 있다.
  몰빵 게임 당첨자와 다른 개념이다.

### 끝전 (takerCost)
- **코드 식별자**: `Settlement.takerCost`
- **정의**: 100원 단위 정리로 덤탱이 쓸 사람이 추가로 부담하는 금액. 정산 복사 문구에만 "(끝전 +N원)" — 정산 카드에서는 뺐다(2026-10-07 사용자 지시).

### 최소 송금 (transfers)
- **코드 식별자**: `Settlement.transfers`, `minTransfers()`
- **정의**: 보낼 사람·받을 사람을 금액 큰 순으로 정렬해 greedy 매칭한 송금 목록. 송금 횟수를 줄이는 방식이다.
- **혼동 주의**: 같은 금액을 보내는 두 사람이라도 송금 대상이 다르게 묶일 수 있다 — 버그가 아니다. 동률은 멤버 순서를 따른다.

## B. 여행 · 지출

### 분류 (category)
- **코드 식별자**: `Expense.category`, `CATEGORIES` (`src/lib/domain/categories.ts`), DB `expenses.category`
- **정의**: 지출 분류 고정 7개 — `식비` `카페·간식` `숙소` `교통` `관광·체험` `쇼핑` `기타`. 트리맵 색 `--cat-0`~`--cat-6` 과 1:1.
- **혼동 주의**: 장보기의 **분류(`ShoppingItem.group`)** 와 이름만 같고 목록이 다르다(`SHOP_GROUPS`: `고기` `채소·쌈` …).

### 장보기 (shopping)
- **코드 식별자**: `ShoppingItem` — `name`·`group`·`done`, DB `shopping_items` — `name`·**`grp`**·`done`
- **정의**: 여행 전에 살 것 체크리스트. 분류별로 묶고 담은 것은 아래로 내린다.
- **혼동 주의**: 코드는 `group`, DB 칼럼은 `grp`(예약어 회피) — `mapping.ts` 에서 바꾼다.
  아티팩트 데이터에 `qty` 가 남아 있는 항목이 있지만 명세상 수량은 입력·표시하지 않는다(웹앱에는 수량 칸이 없다).

### 여행 티켓
- **코드 식별자**: `Ticket` (`src/components/trip/ticket.tsx`)
- **정의**: 여행 화면 맨 위 요약 카드. 여행 이름·날짜·D-day·숙소 패널(주소 + 복사·네이버 지도·카카오맵 아이콘, 숙소 지역 지금 날씨)·총 지출·1인 평균·지출 건수.

### 일차 / D-day (tripBadge)
- **코드 식별자**: `tripBadge()`·`dayLabel()` (`src/lib/domain/dates.ts`)
- **정의**: 여행 전 `D-N`, 여행 중 `N일차`, 끝나면 `여행 끝`. 지출 날짜 헤더에도 "N일차 · " 접두어가 붙는다.
- **혼동 주의**: "오늘"은 서울 기준(`todayIn("Asia/Seoul")`) — 서버가 UTC 라서.

### 여행 링크 (slug)
- **코드 식별자**: `trips.slug`, `newSlug()`·`isValidSlug()` (`src/lib/trips/slug.ts`), 경로 `/t/[slug]`
- **정의**: 여행마다 생기는 추측 불가한 12자 영숫자. 참여자에게는 **이 링크를 아는 것이 곧 보기·입력 권한**이다(설정·삭제 제외).
- **혼동 주의**: 여행 id(uuid)와 다르다. 화면·Server Action 은 slug 로 받고 서버가 id 로 바꾼다(`tripIdOf`).

### 여행 목록 (trips)
- **코드 식별자**: 경로 `/trips`, `listTrips()`, DB 뷰 `trip_summaries`
- **정의**: 여행을 골라 들어가는 화면. **누구나 DB 전체 여행**을 본다(2026-10-07 사용자 결정). 새 여행·삭제는 관리자만.

### 관리자 / 참여자
- **코드 식별자**: `isAdmin()` (`src/lib/auth/admin.ts`), 쿠키 `nb_admin`, 경로 `/admin`, 화면 prop `admin`
- **정의**: **관리자** = 비밀번호로 로그인한 사람 한 명(설정 탭·새 여행·여행 삭제). **참여자** = 여행 링크·목록으로 들어온 누구나, 로그인 없음(그 밖의 전부).
- **혼동 주의**: 정산의 "멤버"(이름)와 다르다 — 참여자는 계정·멤버와 연결되지 않는다. 화면 숨김이 아니라 서버(`requireAdmin`)가 막는다.

## C. 부가 기능

### 몰빵 게임
- **코드 식별자**: `GameTab` (`src/components/game/`), `newLadder()`·`wheelTargetAngle()` (`src/lib/domain/game.ts`) — 룰렛 `wheel`·사다리 `ladder`·폭탄 `bomb`·카드 `cards`
- **정의**: N빵 대신 참여자 중 한 명만 당첨시키는 게임.
- **혼동 주의**: 결과를 **저장하지 않는다**. 당첨자 몫으로 지출을 기록하면 그때 일반 지출(`split=[당첨자]`)이 된다.
  명세의 "미션 고르기(이번 계산·설거지…)"는 웹앱에서 뺐다(2026-10-07) — 코드에 미션이 없다.

### 여행 플레이리스트 (음악 탭)
- **코드 식별자**: `MusicTab` (`src/components/music/`), `getSongs`·`ERAS`·`THEMES`·`cellKey` (`src/lib/music/`), DB `music_cache`
- **정의**: 시대(선택)·테마(필수, 상황 또는 장르 하나) 칩을 고르면 YouTube 재생목록에서 국내 노래 7곡을 뽑아 보여 주는 기능(재생은 안 함).
- **혼동 주의**: 아티팩트판은 내장 135곡 `SONGS` + 연도·분위기·장르 3줄(줄 안 OR·줄끼리 AND)이었다 — 웹앱은 칩 2줄·줄마다 하나.

## D. 플랫폼 (아티팩트판 ↔ 웹앱판)

### 저장 (updatedAt)
- **코드 식별자**: 웹앱 `trips.updated_at` / `TripData.updatedAt`("마지막 저장"), 아티팩트 `rev`·`updatedAt`
- **정의**: 웹앱판은 입력할 때마다 **즉시 저장**(Server Action)하고, 아티팩트판은 모아 둔 변경을 "저장하고 공유"로 HTML 전체 재발행했다.
- **혼동 주의**: 웹앱에는 `rev`·저장 바·localStorage 초안이 없다. "저장"이 어느 쪽 이야기인지 먼저 분간한다.
  아티팩트의 실데이터는 **라이브 아티팩트 안**에만 있다 — 웹앱으로 옮기지 않는다(2026-10-07 결정).

### 변경 신호 (실시간 갱신)
- **코드 식별자**: 채널 `trip:<slug>` / 이벤트 `TRIP_CHANGED`("changed") (`src/lib/realtime/`), 구독 `useLiveUpdates()`
- **정의**: 누가 저장하면 같은 여행을 연 다른 화면들이 새로고침 없이 바뀌게 하는 Supabase Realtime Broadcast 신호.
- **혼동 주의**: 신호에는 **데이터가 없다** — 받은 화면이 서버에서 다시 읽는다. Supabase "postgres_changes"(DB 변경 구독)를 쓰는 게 아니다.
