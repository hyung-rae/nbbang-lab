# CLAUDE.md — nbbang-lab 프로젝트 가이드

친구들과 여행 갈 때 함께 쓰는 **여행 가계부 웹 애플리케이션 "엔빵"**.
Claude 아티팩트로 먼저 만든 버전을 원형으로 삼아 웹앱으로 옮겼다.

@AGENTS.md

## 1. 현재 상태

- **MVP 프로덕션 배포 중 (Vercel, 2026-10-07).** 여행 만들기·목록, 정산·지출·장보기·몰빵 게임·설정, 다른 화면 자동 갱신, 숙소 지금 날씨(NCP 지오코딩 + Open-Meteo), 음악 탭(YouTube 재생목록에서 곡 정보만).
- **권한 (2026-10-07 결정): 로그인은 관리자 한 명(비밀번호), 참여자는 로그인 없이 링크로.**
  관리자만 설정 탭·새 여행·여행 삭제. 참여자(링크·여행 목록으로 들어온 누구나)는 그 밖의 전부(지출·장보기·덤탱이·게임·음악).
  `/trips` 는 누구나 모든 여행을 보고 들어간다 — 사이트 주소를 알면 누구나 모든 여행을 고칠 수 있다(감수한 위험).
  가드는 서버가 정본(`src/lib/auth/`, `trips/actions.ts` `requireAdmin`) — 자세한 것은 [src/lib](src/lib/CLAUDE.md).
- 남은 일: 없음(기능 기준). 아티팩트 실데이터 이관·네이버 로그인·참여자 로그인은 **하지 않는다**(2026-10-07 사용자 결정).

## 2. 기술 스택

| 영역 | 사용 |
|---|---|
| 프레임워크 | Next.js 16 (App Router, `cacheComponents` 끔), React 19, TypeScript |
| UI | Mantine 9 (`core`·`dates`·`notifications`, 기본 테마 + teal) + CSS Modules, lucide-react. 2026-10-07 Tailwind·shadcn 에서 전면 교체 — 체계·함정은 [src/components](src/components/CLAUDE.md) |
| DB | Supabase Postgres — 서버에서 `@supabase/supabase-js` (secret key), 브라우저는 Realtime 신호만 |
| 검증 | zod 4 (화면·Server Action 공용 `src/lib/trips/schema.ts`) |
| 테스트 | Vitest 5, PGlite(마이그레이션 검증) |
| 배포 | Vercel — GitHub 연동(PR → 미리보기, `main` → 프로덕션), 함수 리전 서울 `icn1`(`vercel.json`, Supabase 와 같은 지역) |
| CI | GitHub Actions `.github/workflows/ci.yml` — PR·`main` push 마다 lint·typecheck·test·build (DB·비밀 키 없이) |
| 저장소 | **공개** GitHub `hyung-rae/nbbang-lab` |
| 패키지 | npm (`.claude/settings.json` 허용 목록이 npm 기준) |

## 3. 명령어

```bash
npm run dev         # 개발 서버 http://localhost:3000
npm test            # 단위 테스트 + 스키마 테스트 (vitest run)
npm run typecheck   # next typegen && tsc --noEmit — LayoutProps 등 Next 생성 타입이 필요해서 typegen 먼저
npm run lint
npm run build
```

## 4. 디렉터리 구조

```
src/app/            라우트 — / (새 여행) · /trips (목록) · /t/[slug] (여행 화면), 메타데이터·아이콘·manifest·robots
src/components/     화면 — trip/(여행 화면 탭·시트) · game/ · music/ · form/(날짜·선택) · trips/ · home/ · 공용 틀(page-shell·link-button·notify)
src/lib/            도메인 순수 함수(domain/) · 서버 데이터 계층(trips/·supabase/·realtime/) · 외부 API(weather/·music/) · site.ts
supabase/           마이그레이션 SQL · 스키마 테스트
.github/workflows/  CI
```

디렉터리별 세부는 각 `CLAUDE.md`: [src/lib](src/lib/CLAUDE.md) · [src/components](src/components/CLAUDE.md) · [supabase](supabase/CLAUDE.md).

## 5. 환경변수

`.env.example` 이 정본(설명 포함). `.env.local` 에 채우고, Vercel 에는 같은 이름으로 등록한다.
`SUPABASE_SECRET_KEY`·`NAVER_MAPS_API_KEY_ID`·`NAVER_MAPS_API_KEY`·`YOUTUBE_API_KEY`·`ADMIN_PASSWORD`·`ADMIN_SESSION_SECRET` 는 **서버 전용** — `NEXT_PUBLIC_` 을 붙이지 않는다.

**Vercel 등록** (2026-10-07 배포 때 겪은 것)
- 서버 전용 키는 **Secret**, `NEXT_PUBLIC_*` 는 **Config** — 공개 접두사가 붙은 이름은 Secret 으로 저장하면 Vercel 이 거절한다.
- 적용 환경은 **Production + Preview 둘 다.** Production 만 넣으면 PR 미리보기에서 DB 를 쓰는 화면이 500.
- 값을 바꾸면 **Redeploy** 해야 반영된다. `NEXT_PUBLIC_*` 는 빌드 때 코드에 박히고, 빠지면 오류 없이 **자동 갱신만 꺼진다**(`supabase/browser.ts` 가 null).
- New Project 화면의 Supabase 통합 **[Add] 는 누르지 않는다** — 새 DB 를 만들거나 다른 이름의 키를 넣는다.
- 서울 리전은 응답 헤더 `x-vercel-id` 의 `icn1` 로 확인한다. 대시보드에서 Function Region·Node 버전을 손으로 바꾸면 `vercel.json`·`engines` 보다 우선한다.

## 6. 명세 원본

| 무엇 | 어디 |
|---|---|
| 기능 명세 (정본) | dev-wiki `/Users/hyung-rae/Desktop/dev-wiki/여행 가계부 작업 계획.md` |
| 동작하는 원형 + 실데이터 | Claude 아티팩트 (링크 비공개 — git 밖 private-docs 참고) (바닐라 JS 단일 HTML) |

- 명세를 레포에 복사하지 않는다 — 정본은 dev-wiki 하나. 웹앱에서 명세가 바뀌면 그 문서를 갱신한다.

## 7. 함정 / 주의사항

- **명세의 제약 상당수는 아티팩트 플랫폼 제약 때문이었다** — 웹앱에서는 아래처럼 바꿨다(2026-10-06 사용자 결정).
  - "입력은 소유자만" → 링크를 아는 누구나 입력, 설정·새 여행·삭제만 관리자(비밀번호 로그인, 2026-10-07)
  - "모아서 저장하고 공유"(저장 바·초안·rev) → 입력할 때마다 즉시 저장 + 다른 화면 자동 갱신
  - "예보를 Claude가 넣어 줌·노래 목록 내장" → 숙소 **지금 날씨**(NCP Maps Geocoding + Open-Meteo, 여행일 예보는 안 함 — 2026-10-07), 노래는 YouTube Data API v3 재생목록 검색(내장 135곡 대신, 칩 2줄 — 2026-10-07)
  - **네이버는 날씨 오픈 API 가 없다.** 네이버는 주소 → 좌표(지오코딩)에만 쓰고, 날씨 데이터는 Open-Meteo 에서 받는다.
  - 반대로 **정산 규칙(1원 단위 N빵 → 100원 정리 → 최소 송금)은 제품 결정**이라 그대로 지킨다.
- **아티팩트의 실데이터는 라이브 아티팩트 안에만 있다**(웹앱으로 옮기지 않는다 — 2026-10-07 결정). 로컬 파일로 아티팩트를 재발행하면 데이터가 덮어써진다.
- **로컬 개발·PR 미리보기·프로덕션이 같은 Supabase DB 를 쓴다.** 로컬에서 만든 점검용 여행이 프로덕션 `/trips` 에 그대로 보인다 → 점검 뒤 지운다.
  음악 캐시(`music_cache`)도 같이 쓴다.
- 배포본 브라우저 번들을 검사할 때(공개 키가 들어갔나, 비밀 키가 샜나): Turbopack 은 HTML `<script>` 의 청크가 다른 청크를 다시 불러온다 —
  HTML 에 적힌 청크만 보면 "없다"고 오판한다(실제로 한 번 오판). 청크 안 참조까지 따라간다. 번들의 `sb_secret_` 문자열은 supabase-js 의 키 종류 검사라 유출이 아니다.
- **`AGENTS.md` 를 지우지 않는다.** `next dev` 가 Next.js 규칙 블록을 다시 써 넣는데, `AGENTS.md` 가 없으면 이 파일(보호 파일)에 써 넣는다
  (`node_modules/next/dist/server/lib/generate-agent-files.js`).
- `create-next-app` 은 `.claude/`·`CLAUDE.md` 가 있는 폴더에 바로 만들지 못한다 — 다시 만들 일이 있으면 scratchpad 에 만든 뒤 복사한다.
- `rm -rf` 는 `.claude/settings.json` 에서 막혀 있다. 파일 단위 `rm` 을 쓴다.
- 새 마이그레이션은 Supabase 대시보드 SQL Editor 로 **사용자가 적용**한다 (CLI 미사용). 적용 전에는 그 기능이 실패한다.
- **공개 저장소다.** 원형 아티팩트 링크·실제 숙소 주소·친구 실데이터를 파일·커밋 메시지·PR 에 쓰지 않는다(2026-10-07 기록에서 제거함). 테스트 데이터는 예시 값으로.
- Node 는 `package.json` `engines` 24.x — CI(`node-version-file`)·Vercel 이 이 값을 따른다. `@types/node` 도 ^24 (create-next-app 기본 ^20 은 Vitest 5 peer 와 충돌).

## 8. 협업 문서 체계

충돌 시 우선순위: `.claude/commands/git/commit.md` > `.claude/rules/CONVENTION.md` > `CLAUDE.md` > `.claude/review-rules.md`

| 문서 | 역할 | 관리 |
|---|---|---|
| `.claude/commands/git/commit.md` | 커밋 형식(gitmoji)·분할·브랜치 가드 정본 | `/commit`, `/git:commit`, `/git:pr`, `/git:ship` |
| `.claude/rules/CONVENTION.md` | 규범("이렇게 써라") | 승인 후 수정 |
| `.claude/review-rules.md` | 반복된 실수(R)·작업 방식 지시(W) | `/rule` |
| `.claude/glossary.md` | 사람 말 ↔ 코드 식별자 | `/term` |
| `private-docs/` | 작업 단위 조사·계획·스펙·QA·로그 (git 제외) | `/workdoc` |
| 지식을 어디 남길지 | 라우팅 표 | `/documentation` |

- **W 규칙**은 SessionStart 훅이 세션마다 불러온다. 경로와 무관하게 항상 적용된다.
- **코드 작성 전**: `grep -n "^### R-[0-9]" .claude/review-rules.md` 로 해당 경로 규칙을 읽는다.
- **용어**: 작업 계획 전 `grep -n -B3 -A7 "<용어>" .claude/glossary.md` — 찾으면 **혼동 주의**를 꼭 읽는다.
- **private-docs**: `INDEX.md` 가 유일한 색인, 각 폴더 `log.md` 가 유일한 진행 기록이다. 작업 폴더의 `note.md` 는 사용자가 쓰는 문서 — 있으면 가장 먼저 읽고 요청 없이 고치지 않는다.
- **보호 파일**: 이 파일·`.claude/rules/`·`review-rules.md`·`glossary.md` 는 사용자 승인 후에만 수정한다(PreToolUse 훅이 승인을 요청한다).
