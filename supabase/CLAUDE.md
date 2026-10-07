# supabase/ — DB 스키마

## 구조

| 경로 | 내용 |
|---|---|
| `migrations/*.sql` | 스키마 정본. 파일명 `YYYYMMDDHHMMSS_<이름>.sql`, 적용 순서 = 파일명 순 |
| `tests/schema.test.ts` | 마이그레이션을 **PGlite(WASM Postgres 17)** 에 차례로 적용해 제약·트리거·함수·권한을 검증 (`npm test` 에 포함) |

- 테이블: `trips` · `members` · `expenses` · `expense_splits` · `shopping_items` · `music_cache`
- 함수: `save_expense`(지출 + 나눌 사람) · `add_member` · `add_shopping_item` · `touch_trip`(트리거)
- 뷰: `trip_summaries`(여행 목록용 — 인원·지출 건수·합계를 여행당 한 행)
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
- 앱이 구분해야 하는 DB 오류는 전용 SQLSTATE 를 쓴다: `NB001`(인원 초과)·`NB002`(장보기 개수 초과)·`P0002`(대상 없음). 문구 변환은 `actions.ts` 의 `dbMessages`.
- 뷰는 `security_invoker = true` 로 만든다 — 기본값(만든 사람 권한)이면 RLS 를 건너뛴다.
- 스키마를 바꾸면 `database.types.ts` 도 같이 고친다. CLI 로 연결되면
  `npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts` 로 교체하고 `queries.ts` 의 `as unknown as` 캐스트를 걷어낸다.
- PGlite 에는 Supabase 역할이 없어서 테스트가 `anon`·`authenticated`·`service_role` 을 직접 만든다.
  파라미터 하나를 두 타입 칼럼에 같이 쓰면(`$3` 를 smallint·integer 에) `inconsistent types deduced` 오류가 난다.
