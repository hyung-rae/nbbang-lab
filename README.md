# 엔빵 — 친구 여행 가계부

여행 가서 친구들과 같이 쓴 돈을 적으면 **누가 누구에게 얼마를 보내면 되는지** 바로 보여 주는 웹앱입니다.
여행 링크 하나로 친구들이 로그인 없이 함께 적고, 누가 입력하면 같은 여행을 연 모든 화면이 바로 바뀝니다.

## 주요 기능

- **정산** — 지출마다 1원 단위로 N빵 → 사람별 잔액 → 송금은 100원 단위로 정리(끝전은 "덤탱이 쓸 사람"이 냄) → 최소 송금, 분류별 지출 트리맵
- **지출 내역** — 날짜별 기록, 낸 사람과 나눌 사람 지정
- **장보기** — 분류별 체크리스트, 장 본 금액은 바로 지출로
- **몰빵 게임** — 룰렛·사다리·폭탄·카드로 한 사람 몰아주기
- **숙소 지금 날씨** — 숙소 주소로 좌표를 찾아 현재 날씨·체감 온도, 새로고침
- **여행 플레이리스트** — 시대·테마(드라이브·캠핑·발라드…)를 고르면 YouTube 재생목록에서 국내 노래 7곡
- **실시간 갱신** — 다른 사람이 입력하면 새로고침 없이 반영

## 권한

| | 관리자 (한 명, 비밀번호 로그인) | 참여자 (여행 링크를 받은 누구나, 로그인 없음) |
|---|---|---|
| 정산·지출·장보기·게임·음악 | ✅ | ✅ |
| 여행 목록 보기·들어가기 | ✅ | ✅ |
| 설정(여행 정보·멤버) · 새 여행 · 여행 삭제 | ✅ | ❌ |

> ⚠️ 여행 목록이 공개라서 **사이트 주소를 아는 누구나 모든 여행을 열고 입력할 수 있습니다**(친구들끼리 쓰는 앱이라 감수한 결정).
> 사이트 주소는 함께 쓰는 사람에게만 알려 주세요. 관리자 로그인 화면은 링크로 노출하지 않고 `/admin` 으로 직접 들어갑니다.

## 기술 스택

| 영역 | 사용 |
|---|---|
| 프레임워크 | Next.js 16 (App Router), React 19, TypeScript |
| UI | Mantine 9 + CSS Modules, lucide-react |
| DB | Supabase Postgres (서버에서만 접근), Supabase Realtime (변경 신호) |
| 검증 | zod |
| 테스트 | Vitest, PGlite (마이그레이션·DB 함수 검증) |
| 외부 API | NAVER Cloud Maps Geocoding, Open-Meteo, YouTube Data API v3 |
| 배포 | Vercel (서울 리전 `icn1`), GitHub Actions CI |

## 시작하기

Node.js 24 가 필요합니다.

```bash
npm install
cp .env.example .env.local   # 값 채우기 — 아래 환경변수
npm run dev                   # http://localhost:3000
```

1. Supabase 프로젝트를 만들고 `supabase/migrations/*.sql` 을 **파일명 순서대로** SQL Editor 에서 실행합니다.
2. `.env.local` 을 채웁니다. 설명은 [`.env.example`](.env.example) 에 있습니다.

| 환경변수 | 용도 | 없으면 |
|---|---|---|
| `SUPABASE_URL` · `SUPABASE_SECRET_KEY` | 서버 DB 접근 | 앱이 동작하지 않음 |
| `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 실시간 갱신 신호 (DB 권한 없음) | 자동 갱신만 꺼짐 |
| `ADMIN_PASSWORD` · `ADMIN_SESSION_SECRET` | 관리자 로그인 | 관리자 기능 잠김 |
| `NAVER_MAPS_API_KEY_ID` · `NAVER_MAPS_API_KEY` | 숙소 주소 → 좌표 | 날씨 줄 숨김 |
| `YOUTUBE_API_KEY` | 음악 탭 | 음악 탭 "준비 중" |

`NEXT_PUBLIC_` 이 붙지 않은 키는 모두 서버 전용입니다.

## 명령어

```bash
npm run dev         # 개발 서버
npm test            # 단위 테스트 + 스키마 테스트
npm run typecheck   # next typegen && tsc --noEmit
npm run lint
npm run build
```

## 구조

```
src/app/          라우트 — / · /trips · /t/[slug] · /admin
src/components/   화면 (trip/ · game/ · music/ · form/ · trips/ · home/ · auth/)
src/lib/          정산 등 순수 함수(domain/) · 서버 데이터(trips/ · supabase/ · realtime/) · 외부 API(weather/ · music/) · 인증(auth/)
supabase/         마이그레이션 SQL · 스키마 테스트
```

개발 규칙과 함정은 [CLAUDE.md](CLAUDE.md) 와 디렉터리별 `CLAUDE.md`([src/lib](src/lib/CLAUDE.md) · [src/components](src/components/CLAUDE.md) · [supabase](supabase/CLAUDE.md))에 있습니다.

## 데이터 출처

- 날씨: [Open-Meteo](https://open-meteo.com/) (CC BY 4.0)
- 좌표: NAVER Cloud Platform Maps
- 노래 정보: YouTube Data API — 곡 정보만 보여 주고 재생하지 않습니다
