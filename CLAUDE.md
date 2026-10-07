# CLAUDE.md — nbbang-lab 프로젝트 가이드

친구들과 여행 갈 때 함께 쓰는 **여행 가계부 웹 애플리케이션**.
Claude 아티팩트로 먼저 만든 버전을 원형으로 삼아 웹앱으로 옮긴다.

## 1. 현재 상태

- **코드 없음 — 초기 세팅 단계.** 기술 스택·백엔드·인증 방식 미정.
- 스택이 정해지면 이 문서에 **기술 스택 / 명령어 / 디렉터리 구조** 절을 추가한다(W-004).

## 2. 명세 원본

| 무엇 | 어디 |
|---|---|
| 기능 명세 (정본) | dev-wiki `/Users/hyung-rae/Desktop/dev-wiki/여행 가계부 작업 계획.md` |
| 동작하는 원형 + 실데이터 | Claude 아티팩트 (링크 비공개 — git 밖 private-docs 참고) (바닐라 JS 단일 HTML) |

- 명세를 레포에 복사하지 않는다 — 정본은 dev-wiki 하나. 웹앱에서 명세가 바뀌면 그 문서를 갱신한다.
- 정산 계산·트리맵·게임 로직·디자인 토큰은 아티팩트 코드를 그대로 참고할 수 있다.

## 3. 함정 / 주의사항

- **명세의 제약 상당수는 아티팩트 플랫폼 제약 때문이다** — 웹앱에서 그대로 따를 필요는 없다.
  - "입력은 소유자만": 공개 링크에서 조직 밖 편집자가 읽기 권한으로 떨어지는 아티팩트 제약
  - "데이터를 HTML에 넣고 재발행": 아티팩트 공유 DB가 로그아웃 방문자에게 안 보이는 제약
  - "예보를 Claude가 넣어 줌·노래 목록 내장": 아티팩트 안에서 외부 `fetch`가 막히는 제약
  - 반대로 **정산 규칙(1원 단위 N빵 → 100원 정리 → 최소 송금)은 제품 결정**이라 그대로 지킨다.
- **아티팩트의 실데이터는 라이브 아티팩트 안에만 있다.** 이관할 때는 아티팩트를 읽어 `trip-data` JSON을 가져온다 — 로컬 파일로 아티팩트를 재발행하면 데이터가 덮어써진다.
- 문서와 아티팩트 사이에 이미 차이가 있다(제목, 예보 표시, 음악 분위기·장르 개수). 구현 기준이 헷갈리면 사용자에게 확인한다.

## 4. 협업 문서 체계

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
