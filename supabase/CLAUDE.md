# supabase/ — DB 스키마

## 구조

| 경로 | 내용 |
|---|---|
| `migrations/*.sql` | 스키마 정본. 파일명 `YYYYMMDDHHMMSS_<이름>.sql`, 적용 순서 = 파일명 순 |
| `tests/schema.test.ts` | 마이그레이션을 **PGlite(WASM Postgres 17)** 에 차례로 적용해 제약·트리거·함수·권한을 검증 (`npm test` 에 포함) |

- 테이블: `trips` · `members` · `expenses` · `expense_splits` · `shopping_items` · `music_cache`
- 함수: `save_expense`(지출 + 나눌 사람) · `save_trip_settings`(설정 한 번에 저장: 여행 정보(+ `password` 키가 있으면 입장 비밀번호)·멤버 빼기·색·추가) · `add_member`(지금 화면은 안 씀) · `add_shopping_item` · `touch_trip`(트리거)
- 뷰: `trip_summaries`(여행 목록용 — 인원·지출 건수·합계·`has_password` 를 여행당 한 행. 비밀번호 값은 넣지 않는다)
- `trips.entry_password`: 입장 비밀번호 평문 4~20자, null 이면 열린 여행(20261009). 서버만 읽는다 — 화면 데이터로 내보내지 않는다(`src/lib/CLAUDE.md`)
- TS 타입: `src/lib/supabase/database.types.ts` (지금은 손으로 맞춤 — 아래 함정)

## 접근 모델 (인증 도입 전)

- 브라우저는 테이블에 **직접 접근하지 않는다.** 모든 읽기·쓰기는 Next.js 서버가 secret key 로 한다.
- 모든 테이블 RLS on + `anon`·`authenticated` 권한 회수. 함수 실행·뷰 조회도 `service_role` 만.
  → publishable key 가 공개돼도 DB 를 못 읽는다. publishable key 는 Realtime 신호 수신에만 쓴다.
- 새 테이블·함수·뷰를 만들면 **같은 마이그레이션에서 권한 회수/부여까지** 한다. 테스트의 "anon·authenticated 는 … 쓸 수 없다" 케이스에 추가한다.

## 적용 방법

Supabase CLI 를 아직 쓰지 않는다. 대시보드 **SQL Editor** 에 새 마이그레이션 파일 내용을 붙여 실행한다(사용자 작업).
`npm test` 의 스키마 테스트가 통과한 SQL 만 적용한다. 이미 적용한 파일은 고치지 않고 새 파일을 만든다.

## 함정

- **멤버를 가리키는 FK 는 `deferrable initially deferred` 여야 한다.** 즉시 검사(`restrict`·`no action`)면 여행 삭제 cascade 가
  지출보다 멤버를 먼저 지우는 순간 위반으로 실패한다 (PGlite 테스트로 재현). 커밋 시점 검사라 "지출에 든 멤버 삭제 금지"는 그대로 막힌다.
- **"읽고 → 계산 → 넣기"를 앱에서 나눠 하지 않는다.** 동시 요청이 같은 값을 읽어 제한이 뚫리고 `sort_order` 가 겹친다(코드 리뷰 지적).
  여행 행을 `for update` 로 잠그는 DB 함수(`add_member` 패턴)로 처리한다. `members (trip_id, sort_order)` 는 unique 다.
- **trips ↔ members 사이 FK 가 둘**(`members.trip_id`, 덤탱이 `trips_taker_fk`)이라 PostgREST 임베드는 `members!members_trip_id_fkey(*)` 처럼 이름을 지정해야 한다.
- 같은 여행 멤버만 참조하도록 `(member_id, trip_id)` 복합 FK 를 쓴다 — 그래서 `members`·`expenses` 에 `unique (id, trip_id)` 가 있다.
- `touch_trip()` 이 하위 테이블 변경 시 `trips.updated_at`("마지막 저장")을 갱신한다. **예보·좌표 캐시(`forecast`·`lat`·`lng`)만 바뀐 것은 갱신하지 않는다.**
- `trips.lat`·`lng` 는 숙소 좌표 — `save_trip_settings` 가 아니라 앱(`actions.ts` `fillCoords`)이 저장 뒤 따로 쓴다(지오코딩은 DB 밖 외부 호출).
  `trips.forecast` 는 **쓰지 않는다**(2026-10-07: 여행일 예보 대신 지금 날씨를 매번 받기로 함). 매핑(`toForecast`)만 남아 있고, 정리는 다음 스키마 변경 때 한다.
  `music_cache` 는 음악 탭 칸 캐시 — 키 `pl2:{시대}:{테마}`(`src/lib/music/chips.ts` `cellKey`), `videos` 는 `{ id, title, artist }[]`(썸네일은 저장하지 않고 화면이 id 로 만든다 — 예전 행의 `thumb` 는 읽을 때 버린다).
  판 번호가 바뀌면 옛 키 행은 쓰이지 않고 남는다(작아서 두지만, 30일 넘은 값은 앱이 쓰지 않는다).
- 멤버 색 `members.color` 는 **0~11**(20261008 에서 0~5 → 0~11). 화면 `parts.tsx` `MEMBER_COLORS` 순서와 1:1 — 앞 6개 순서를 바꾸면 기존 멤버 색이 바뀐다.
- jsonb 인자는 SQL `NULL` 과 jsonb `null` 이 다르다 — "없으면 건너뜀"은 `jsonb_typeof(x) = 'object'` 로 검사한다(`save_trip_settings`, 테스트로 재현).
- 앱이 구분해야 하는 DB 오류는 전용 SQLSTATE 를 쓴다: `NB001`(인원 초과)·`NB002`(장보기 개수 초과)·`P0002`(대상 없음). 문구 변환은 `actions.ts` 의 `dbMessages`.
- 뷰는 `security_invoker = true` 로 만든다 — 기본값(만든 사람 권한)이면 RLS 를 건너뛴다.
- 스키마를 바꾸면 `database.types.ts` 도 같이 고친다. CLI 로 연결되면
  `npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts` 로 교체하고 `queries.ts` 의 `as unknown as` 캐스트를 걷어낸다.
- **남은 결함 — 다음 스키마 변경 때 같이 고친다** (모두 service_role 전용 함수라 당장 위험은 낮다):
  `save_trip_settings` 는 `p_trip` 이 오면 여행 정보 네 칸을 통째로 덮어쓴다(한 칸만 고쳐도 — 짧은 틈에 다른 화면의 변경을 잃을 수 있음).
  `p_colors`·`p_add` 에 jsonb `null` 이 오면 알기 어려운 오류(`coalesce` 는 SQL NULL 만 처리 — 앱은 배열만 보낸다).
  `p_max` 가 NULL 이면 인원·개수 검사가 꺼진다(`save_trip_settings`·`add_member`·`add_shopping_item` — 앱은 상수만 넘긴다).
- PGlite 에는 Supabase 역할이 없어서 테스트가 `anon`·`authenticated`·`service_role` 을 직접 만든다.
  파라미터 하나를 두 타입 칼럼에 같이 쓰면(`$3` 를 smallint·integer 에) `inconsistent types deduced` 오류가 난다.
