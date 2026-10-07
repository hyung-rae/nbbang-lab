---
model: sonnet
description: 현재 브랜치의 변경사항을 적절한 커밋 단위로 쪼개고, 커밋 컨벤션(gitmoji)에 맞춰 커밋 (계획 출력 후 확인 없이 실행). 커밋 컨벤션의 레포 내 정본.
argument-hint: '[선택] 이슈번호(footer용) 또는 분할 힌트. 예) #12'
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git branch:*), Bash(git switch:*), Bash(git checkout:*), Bash(git restore:*), Bash(git rev-parse:*), Bash(git show:*)
---

# 주의사항

최종 변경 상태를 임의로 수정하지 않고, 사용자가 수정한 최종상태를 기준으로 진행한다.

# 작업 단위로 쪼개서 커밋 (레포 내 정본)

> 이 문서가 **커밋 컨벤션의 레포 내 정본**이다. `/commit` 스킬·`/git:ship`·자연어 커밋 요청 모두 이 절차를 따른다.
> qshop-site 팀 컨벤션(gitmoji)을 그대로 가져왔다.

## 0. 브랜치 가드 (자동 브랜치 생성)

- `git rev-parse --abbrev-ref HEAD` 로 현재 브랜치를 확인한다.
- **현재 브랜치가 `main` / `master` / `dev` 이면** → 직접 커밋하지 않고 **새 작업 브랜치를 자동 생성**해 그 위에서 진행한다.
  - 형식 `<type>/<짧은-설명>` (kebab-case). type은 주된 커밋 타입(feat·fix·refactor·docs·chore·style 등). 예) `feat/settle-treemap`.
  - `git switch -c <브랜치명>` 후 브랜치명을 사용자에게 알린다(다른 이름을 원하면 말해달라고 한 줄).
  - **예외**: 커밋이 하나도 없는 저장소의 첫 커밋(초기 세팅)은 `main` 에 바로 한다.
- 그 외 브랜치면 현재 브랜치 그대로 진행.
- 이 커맨드는 **커밋까지만** 한다. **push 하지 않는다.**

## 1. 변경사항 파악

- `git status --porcelain` (staged·unstaged·untracked 전부)
- `git diff` + `git diff --staged` 로 실제 내용 확인
- 필요시 `git log --oneline -10` 으로 최근 스타일 참고

## 2. 커밋 단위로 분할

변경을 **관심사/기능 단위**로 묶는다:

- 타입(기능·버그·리팩터·문서·스타일)이 다르면 분리.
- 프론트엔드/백엔드·패키지 경계가 다르면 가급적 분리.
- 서로 의존적인 변경은 한 커밋으로. 무관한 변경을 섞지 않는다.
- 각 단위마다 `git add <구체적 경로>` — **`git add -A`/`.` 금지** (의도치 않은 파일 방지).

## 3. 커밋 계획 제시 (기본: 확인 없이 진행)

커밋 전에 계획을 표(`# | 커밋 메시지(제목) | 포함 파일`)로 **출력한다**. 기록은 남기되 **승인을 기다리지 않고 바로 4~5단계로 진행**한다 — 커밋은 로컬이고 되돌릴 수 있다.

**멈추고 확인받는 경우** (그 외에는 묻지 않는다):

- **사용자가 요청한 경우** — "계획 먼저 보여줘", "확인받고 해줘", "커밋 단위 상의하자" 등.
- **되돌리기 어려운 작업이 섞인 경우** — force-push류, 파일·브랜치·워크트리 삭제.
- **계획 자체가 불확실한 경우** — 무관해 보이는 변경이 섞여 분할 기준을 정할 수 없거나, 내가 만들지 않은 변경이 스테이징에 섞여 있을 때. 추측으로 묶지 말고 묻는다.

## 4. 커밋 메시지 형식

구조: **제목 / 본문 / 꼬리말** — 각 영역은 빈 줄로 구분.

```
<이모지> <Type>: [<scope>] <제목>

<본문: 무엇을·왜 바꿨는지 상세히 (한국어). 변경 이유·내용·영향 범위>

<footer(선택): 이슈번호>
```

- **제목**: Type 첫 글자 대문자, 콜론 뒤에만 공백, 한국어. `[<scope>]`는 선택 — 레포 구조가 정해지면 관행을 `.claude/rules/CONVENTION.md` 에 적는다.
- **본문**: 변경 이유·내용·영향 범위. 여러 파일이면 `-` 항목별 정리. 사소한 단일 변경은 생략 가능.
- **footer(선택)**: `Fixes`/`Resolves`/`Ref`/`Related to`: `#이슈번호`. 여러 개는 쉼표로. 인자에 이슈번호가 있으면 사용.
- **트레일러 금지**: `Co-Authored-By` 등 서명·트레일러를 추가하지 않는다 (qshop-site 컨벤션 그대로).

### 자동 판별 규칙

- **hotfix 브랜치**(`hotfix/*` 등 'hotfix' 포함) → 타입 **🚑 Hotfix**.
- **Release 커밋**: diff에 `package.json` version 변경이 있으면 Release로 판단, 바뀐 자리수로 major/minor/patch 결정 → `🔖 Release:<level> <X.Y.Z>` (숫자만).

### 이모지 · Type 표 (21종)

| 이모지 | Type       | 용도                                             |
| ------ | ---------- | ------------------------------------------------ |
| ✨     | Feat       | 신규 기능 추가                                   |
| 🐛     | Fix        | 버그/이슈 수정                                   |
| 🚑     | Hotfix     | 치명적 버그 긴급 수정                            |
| ➕     | Add        | 새 코드/파일 추가                                |
| 🔥     | Remove     | 코드/파일 삭제                                   |
| 🎨     | Implement  | 비교적 큰 단위 구현                              |
| 📦     | Use        | 라이브러리/프레임워크 사용 코드 추가             |
| ♻️     | Refactor   | 리팩터링                                         |
| ♻️     | Update     | 무언가 업데이트                                  |
| ⚡️     | Improve    | 성능·구조·접근성 개선                            |
| 💄     | Design     | CSS 등 UI 디자인 변경                            |
| 🛠️     | Style      | 포매팅·세미콜론·console 삭제 등 (동작 변경 없음) |
| 📝     | Docs       | 문서 수정                                        |
| 💡     | Comment    | 주석 추가/변경                                   |
| 🚚     | Move       | 코드/파일 이동                                   |
| 👷     | Chore      | 빌드/패키지 설정 등 (코드 변경 없음)             |
| 🚧     | Wip        | 진행 중 작업                                     |
| 🔀     | Merge      | 코드 병합                                        |
| ⏪     | Revert     | 변경 되돌리기                                    |
| 🐧     | Experiment | 실험적 기능                                      |
| 🔖     | Release    | 릴리즈/버전 태그 (major/minor/patch)             |

## 5. 커밋 실행

3단계 계획대로 각 단위에 대해: `git add <경로...>` → `git commit`(여러 줄은 `-m` 반복 또는 heredoc).

## 6. 결과 보고

`git log --oneline -<N>` 으로 생성된 커밋을 보여주고, 잔여 변경이 있으면 알린다. (push는 `/git:pr` 또는 `/git:ship`에서)
