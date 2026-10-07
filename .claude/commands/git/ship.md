---
model: sonnet
description: 커밋과 PR을 한 번에 — 변경을 커밋 단위로 쪼개 커밋(/git:commit)한 뒤, push하고 PR 생성(/git:pr)
argument-hint: '[선택] PR base 브랜치 (없으면 main)'
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git branch:*), Bash(git switch:*), Bash(git rev-parse:*), Bash(git rev-list:*), Bash(git restore:*), Bash(git push:*), Bash(gh pr view:*), Bash(gh pr list:*), Bash(gh pr create:*), Bash(gh repo view:*)
---

# 주의사항

최종 변경 상태를 임의로 수정하지 않고, 사용자가 수정한 최종상태를 기준으로 진행한다.

# 커밋 + PR 한 번에 (ship)

현재 브랜치의 변경을 적절한 단위로 커밋한 뒤, push하고 PR까지 생성한다. **두 단계는 각각 `/git:commit`, `/git:pr` 커맨드의 절차를 그대로 따른다**(그 문서가 정본). 여기서는 순서와 연결만 담당한다.

## 1단계 — 커밋 (`.claude/commands/git/commit.md` 절차)

- `commit.md`의 절차대로: 변경 파악 → **커밋 단위 분할 → 계획 표 출력** → 단위별 stage & 컨벤션 커밋.
- 커밋할 변경이 **하나도 없으면** 이 단계를 건너뛰고 2단계로 간다(이미 커밋된 내용으로 PR만 만들 수 있음).
- 브랜치 가드도 `commit.md`와 동일: 현재 브랜치가 `main`/`master`/`dev` 면 **새 작업 브랜치를 자동 생성**해 그 위에서 진행(이후 2단계 push/PR도 그 브랜치 기준).

## 2단계 — push + PR (`.claude/commands/git/pr.md` 절차)

- 1단계 완료(또는 스킵) 후, `pr.md`의 절차대로 진행:
  - **base 브랜치** = 인자(`$ARGUMENTS`)가 있으면 그 브랜치, 없으면 **`main`**.
  - `git push -u origin <현재브랜치>`.
  - 해당 head 브랜치의 열린 PR이 **있으면 링크만 출력**, **없으면** `gh pr create --base <base> --head <현재브랜치> --assignee @me` (제목·본문은 커밋 기반, 출력 후 바로 생성).

## 흐름 / 주의

- 순서: **커밋 → push → PR**. 1단계에서 커밋이 생성되어야 2단계 push에 반영된다.
- base 대비 올릴 커밋이 전혀 없으면(커밋도 없고 ahead도 0) "PR 만들 변경 없음"으로 멈춘다.
- **기본은 확인 없이 커밋→push→PR까지 끝까지 진행**한다. 커밋 계획과 PR 본문은 출력하되 승인을 기다리지 않는다.
- 멈추는 경우는 `commit.md` 3단계·`pr.md` 2단계에 정의된 예외뿐 — force-push류, 사용자가 확인을 요청한 경우, 커밋 분할 기준이 불확실한 경우, 리모트가 없는 경우.
- 머지/force-push는 하지 않는다.

## 결과 출력

생성한 커밋 목록(`git log --oneline`)과 최종 **PR URL**을 함께 보여준다.
