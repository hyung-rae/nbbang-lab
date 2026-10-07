# CLAUDE.md — nbbang-lab 프로젝트 가이드

친구들과 여행 갈 때 함께 쓰는 **여행 가계부 웹 애플리케이션 "엔빵"**.
Claude 아티팩트로 먼저 만든 버전을 원형으로 삼아 웹앱으로 옮겼다.

@AGENTS.md

## 1. 현재 상태

- **MVP 동작 중 (로컬).** 여행 만들기·목록, 정산·지출·장보기·몰빵 게임·설정, 다른 화면 자동 갱신.
- **인증 없음 (의도된 결정, 2026-10-06).** 여행 링크(slug)를 아는 누구나 보고 입력한다. `/trips` 는 DB 전체 여행을 보여 준다(임시).
  로그인 작업 때 권한 검사(`src/lib/trips/actions.ts` `tripIdOf`)·여행 목록 범위·Realtime 채널을 함께 바꾼다.
- 남은 일: 음악(YouTube Data API v3)·예보(카카오 로컬 + Open-Meteo), 아티팩트 실데이터 이관.

## 2. 기술 스택

| 영역 | 사용 |
|---|---|
| 프레임워크 | Next.js 16 (App Router, `cacheComponents` 끔), React 19, TypeScript |
| UI | Tailwind 4, shadcn 4 `base-nova` (= **Base UI**, Radix 아님), lucide-react, sonner |
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
src/components/     화면 — trip/(여행 화면 탭·시트) · game/ · form/(날짜·선택) · trips/ · home/ · ui/(shadcn 생성물)
src/lib/            도메인 순수 함수(domain/) · 서버 데이터 계층(trips/·supabase/·realtime/) · site.ts
supabase/           마이그레이션 SQL · 스키마 테스트
.github/workflows/  CI
```

디렉터리별 세부는 각 `CLAUDE.md`: [src/lib](src/lib/CLAUDE.md) · [src/components](src/components/CLAUDE.md) · [supabase](supabase/CLAUDE.md).

## 5. 환경변수

`.env.example` 이 정본(설명 포함). `.env.local` 에 채우고, Vercel 에는 같은 이름으로 등록한다.
`SUPABASE_SECRET_KEY`·`KAKAO_REST_API_KEY`·`YOUTUBE_API_KEY` 는 **서버 전용** — `NEXT_PUBLIC_` 을 붙이지 않는다.

## 6. 명세 원본

| 무엇 | 어디 |
|---|---|
| 기능 명세 (정본) | dev-wiki `/Users/hyung-rae/Desktop/dev-wiki/여행 가계부 작업 계획.md` |
| 동작하는 원형 + 실데이터 | Claude 아티팩트 (링크 비공개 — git 밖 private-docs 참고) (바닐라 JS 단일 HTML) |

- 명세를 레포에 복사하지 않는다 — 정본은 dev-wiki 하나. 웹앱에서 명세가 바뀌면 그 문서를 갱신한다.

## 7. 함정 / 주의사항

- **명세의 제약 상당수는 아티팩트 플랫폼 제약 때문이었다** — 웹앱에서는 아래처럼 바꿨다(2026-10-06 사용자 결정).
  - "입력은 소유자만" → 링크를 아는 누구나 입력 (인증은 추후)
  - "모아서 저장하고 공유"(저장 바·초안·rev) → 입력할 때마다 즉시 저장 + 다른 화면 자동 갱신
  - "예보를 Claude가 넣어 줌·노래 목록 내장" → 카카오 로컬 + Open-Meteo, YouTube Data API v3 (미구현)
  - 반대로 **정산 규칙(1원 단위 N빵 → 100원 정리 → 최소 송금)은 제품 결정**이라 그대로 지킨다.
- **아티팩트의 실데이터는 라이브 아티팩트 안에만 있다.** 이관할 때는 아티팩트를 읽어 `trip-data` JSON을 가져온다 — 로컬 파일로 아티팩트를 재발행하면 데이터가 덮어써진다.
- 문서와 아티팩트 사이에 차이가 있다(제목, 예보 표시, 음악 분위기·장르 개수). 구현 기준이 헷갈리면 사용자에게 확인한다.
- **`AGENTS.md` 를 지우지 않는다.** `next dev` 가 Next.js 규칙 블록을 다시 써 넣는데, `AGENTS.md` 가 없으면 이 파일(보호 파일)에 써 넣는다
  (`node_modules/next/dist/server/lib/generate-agent-files.js`).
- `create-next-app` 은 `.claude/`·`CLAUDE.md` 가 있는 폴더에 바로 만들지 못한다 — 다시 만들 일이 있으면 scratchpad 에 만든 뒤 복사한다.
- `rm -rf` 는 `.claude/settings.json` 에서 막혀 있다. 파일 단위 `rm` 을 쓴다.
- 새 마이그레이션은 Supabase 대시보드 SQL Editor 로 **사용자가 적용**한다 (CLI 미사용). 적용 전에는 그 기능이 실패한다.
- **공개 저장소다.** 원형 아티팩트 링크·실제 숙소 주소·친구 실데이터를 파일·커밋 메시지·PR 에 쓰지 않는다(2026-10-07 기록에서 제거함). 테스트 데이터는 예시 값으로.
- Node 는 `package.json` `engines` 24.x — CI(`node-version-file`)·Vercel 이 이 값을 따른다.

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
