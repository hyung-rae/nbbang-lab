# Vercel 배포 연결 가이드

엔빵을 Vercel 에 연결해 **PR → 미리보기 배포, `main` 머지 → 프로덕션 배포**가 자동으로 되게 하는 절차.
처음 한 번만 하면 되고, 이후에는 GitHub 에 push 하는 것만으로 배포된다.

| 구성 | 값 |
|---|---|
| 저장소 | GitHub `hyung-rae/nbbang-lab` |
| 프레임워크 | Next.js 16 (Vercel 이 자동 인식) |
| 함수 리전 | 서울 `icn1` — 저장소의 `vercel.json` 이 지정 (Supabase 프로젝트와 같은 지역) |
| Node | 24.x — `package.json` `engines` 를 Vercel 이 따른다 |
| CI | GitHub Actions(`.github/workflows/ci.yml`)가 lint·typecheck·test·build 를 따로 돌린다. 배포와 별개 |

---

## 0. 준비물

- [ ] GitHub `hyung-rae` 계정 (저장소 소유 계정)
- [ ] Supabase 프로젝트의 값 4개 — 로컬 `.env.local` 에 있는 것과 같다
- [ ] Supabase 마이그레이션이 모두 적용돼 있을 것 (`supabase/migrations/` 의 모든 파일)

## 1. Vercel 가입·로그인

1. https://vercel.com 접속 → **Sign Up**(또는 Log In)
2. **Continue with GitHub** → `hyung-rae` 계정으로 승인
3. 플랜은 **Hobby**(무료). 개인·비상업 용도면 충분하다

## 2. 저장소 가져오기

1. 대시보드 오른쪽 위 **Add New… → Project**
2. **Import Git Repository** 목록에서 `nbbang-lab` 옆 **Import**
   - 목록에 없으면 **Adjust GitHub App Permissions** (또는 "Configure GitHub App") →
     Repository access 에서 `nbbang-lab` 을 허용하고 돌아온다

## 3. 프로젝트 설정 (Configure Project 화면)

| 항목 | 값 |
|---|---|
| Project Name | `nbbang-lab` (주소가 `nbbang-lab.vercel.app` 이 된다. 이미 쓰이면 다른 이름) |
| Framework Preset | **Next.js** (자동) |
| Root Directory | `./` (그대로) |
| Build / Output / Install Command | 모두 기본값 (그대로) |

### 환경변수 (Environment Variables)

**Environment Variables** 를 펼쳐 아래 4개를 넣는다. `.env.local` 내용을 통째로 복사해 입력칸에 붙여 넣으면 한 번에 들어간다(빈 값 줄은 지운다).

| 이름 | 값 | 비고 |
|---|---|---|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` | |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` | **비밀** — 서버 전용 |
| `NEXT_PUBLIC_SUPABASE_URL` | `SUPABASE_URL` 과 같은 값 | 브라우저에 노출됨(정상) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | 브라우저에 노출됨(정상) — Realtime 신호 수신 전용, DB 권한 없음 |

- 적용 환경은 **Production · Preview · Development 모두** 체크(기본값).
- 지금은 넣지 않아도 되는 것: `NEXT_PUBLIC_SITE_URL`(7단계), `KAKAO_REST_API_KEY`·`YOUTUBE_API_KEY`(예보·음악 기능을 만들 때).
- ⚠️ `SUPABASE_SECRET_KEY` 에 `NEXT_PUBLIC_` 을 붙이지 않는다. 붙이면 브라우저 코드에 키가 들어간다.

## 4. 첫 배포

**Deploy** 를 누른다.

> ⚠️ **첫 배포는 실패하는 게 정상이다.** 첫 배포는 `main` 을 빌드하는데, `main` 에는 아직 초기 설정 커밋만 있고 앱 코드가 없다.
> 실패해도 프로젝트 연결은 끝난 상태다. 대시보드로 넘어가면 된다.

## 5. PR 미리보기 배포

Vercel 이 연결된 **뒤에** PR 브랜치에 push 가 일어나면 미리보기(Preview) 배포가 자동으로 만들어지고,
PR 에 Vercel 봇이 미리보기 주소를 댓글로 단다.

- PR 을 아직 안 만들었다면: `git push -u origin feat/webapp-mvp` → GitHub 에서 PR 생성
- 연결 **전에** 이미 push 해 둔 브랜치라 미리보기가 안 생겼다면:
  Vercel 프로젝트 → **Deployments** → 오른쪽 위 **Create Deployment** → 브랜치 `feat/webapp-mvp` 선택 → Create

## 6. 미리보기에서 확인할 것

미리보기 주소(`https://nbbang-lab-git-feat-webapp-mvp-….vercel.app` 형태)를 폰과 PC 에서 열어 확인한다.

- [ ] 홈에 "엔빵" 헤더·새 여행 폼이 보인다
- [ ] 여행을 만들면 `/t/…` 로 이동한다 → 설정 탭에서 멤버 추가 → 지출 추가 → 정산 탭 금액이 맞다
- [ ] 같은 여행 링크를 다른 기기(또는 다른 탭)로 열어 두고 한쪽에서 입력 → 다른 쪽이 새로고침 없이 바뀐다 (실시간 갱신)
- [ ] `/trips` 에 여행이 보이고, 삭제가 된다 (점검용으로 만든 여행은 여기서 지운다)
- [ ] 서울 리전: 브라우저 개발자 도구 → Network → 페이지 요청의 응답 헤더 `x-vercel-id` 에 `icn1` 이 들어 있다
- [ ] GitHub PR 화면에서 CI(`check`)와 Vercel 체크가 모두 초록색이다

> 미리보기도 **실제 Supabase DB** 를 쓴다(환경변수가 같으므로). 점검용 데이터는 확인 후 `/trips` 에서 지운다.

## 7. 머지 → 프로덕션

1. PR 을 **Merge** → `main` 이 바뀌면 프로덕션 배포가 자동으로 시작된다
2. 완료되면 프로덕션 주소(`https://nbbang-lab.vercel.app` 등)에서 6단계 확인을 한 번 더
3. (선택) 링크 미리보기(OG 이미지)·sitemap 의 주소를 고정하려면
   Settings → Environment Variables 에 `NEXT_PUBLIC_SITE_URL` = 프로덕션 주소(예: `https://nbbang-lab.vercel.app`)를 Production 에 추가 → **Redeploy**
   - 넣지 않아도 Vercel 이 주는 프로덕션 주소(`VERCEL_PROJECT_PRODUCTION_URL`)를 대신 쓴다 (`src/lib/site.ts`)

이후 흐름: 작업 브랜치 push → PR(미리보기 + CI) → 확인 → 머지(프로덕션).

---

## 문제 해결

| 증상 | 원인 · 해결 |
|---|---|
| 화면에 오류, 로그에 `SUPABASE_URL / SUPABASE_SECRET_KEY 가 없습니다` | 환경변수 누락·오타. Settings → Environment Variables 확인 후 **Redeploy** (환경변수는 바꾼 뒤 다시 배포해야 반영된다) |
| 입력은 되는데 다른 화면이 자동으로 안 바뀐다 | `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 누락. `NEXT_PUBLIC_` 값은 **빌드 때 코드에 박히므로** 고친 뒤 반드시 Redeploy |
| 멤버·장보기 추가나 `/trips` 만 실패 | `20261007…` 마이그레이션 미적용. Supabase SQL Editor 에서 적용 |
| 빌드 실패 `Couldn't find any pages or app directory` | `main` 에 앱 코드가 없을 때(첫 배포). PR 을 머지하면 해결 |
| Node 버전 관련 빌드 오류 | Settings → Build and Deployment → Node.js Version 이 24.x 인지 (`engines` 를 따르지만 수동 설정이 있으면 그게 우선) |
| `x-vercel-id` 에 `icn1` 이 없다 | `vercel.json` 이 배포에 포함됐는지, Settings → Functions → Function Region 을 수동으로 바꾸지 않았는지 |
| 저장소가 Import 목록에 없다 | GitHub App 에 저장소 접근 권한이 없다 → 2단계의 Adjust GitHub App Permissions |

## ⚠️ 배포 전 알아 둘 것 — 인증 없음

지금은 로그인이 없어서 **배포 주소를 아는 누구나 `/trips` 에서 모든 여행을 보고 지울 수 있다**(2026-10-06 결정, 인증 전 임시).
`robots.txt` 의 검색 차단은 보호 장치가 아니다. 주소는 함께 쓰는 친구들에게만 공유하고, 인증 작업을 다음 우선순위로 둔다.
