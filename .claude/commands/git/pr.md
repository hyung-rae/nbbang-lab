---
model: haiku
description: 현재 브랜치를 push하고 PR 생성 (인자로 base 브랜치 지정, 없으면 main). 이미 PR이 있으면 링크만 출력
argument-hint: '[선택] base 브랜치명 (없으면 main)'
allowed-tools: Bash(git rev-parse:*), Bash(git branch:*), Bash(git status:*), Bash(git log:*), Bash(git rev-list:*), Bash(git diff:*), Bash(git push:*), Bash(gh pr view:*), Bash(gh pr list:*), Bash(gh pr create:*), Bash(gh repo view:*)
---

# 주의사항

최종 변경 상태를 임의로 수정하지 않고, 사용자가 수정한 최종상태를 기준으로 진행한다.

# 브랜치 push + PR 생성

현재 브랜치를 origin에 push하고, base 브랜치로 PR을 만든다. 이미 PR이 있으면 새로 만들지 않고 링크만 출력한다.

## 1. 대상 결정

- **base 브랜치**: 인자(`$ARGUMENTS`)가 있으면 그 브랜치, 없으면 **`main`**.
- **head 브랜치(현재)**: `git rev-parse --abbrev-ref HEAD`.

## 2. 가드

- `origin` 리모트가 없으면(`git remote` 결과에 없음) 멈추고 알린다.
- 현재 브랜치 == base 면 멈춘다(자기 자신으로 PR 불가).
- base 대비 커밋이 없으면(`git rev-list --count origin/<base>..HEAD` 가 0, base 미존재 시 로컬 비교) "PR 만들 변경 없음"을 알리고 멈춘다.
- 커밋 안 된 변경이 남아 있으면 알린다(필요하면 `/git:commit` 먼저 안내). push는 커밋된 내용만 올라감.

## 3. push

```bash
git push -u origin <현재브랜치>
```

## 4. 기존 PR 확인 → 생성 or 링크 출력

먼저 해당 head 브랜치의 열린 PR이 있는지 확인:

```bash
gh pr list --head <현재브랜치> --state open --json url,number,baseRefName,title
```

- **이미 있으면**: 새로 만들지 않고 **PR 링크(url)만 출력**한다(번호·base·제목 함께).
- **없으면**: 새로 생성한다.

  - 제목/본문은 base 대비 커밋(`git log origin/<base>..HEAD --oneline`)을 바탕으로 작성. 제목은 커밋 컨벤션 스타일(`이모지 Type: 제목`)을 따르되 브랜치 전체를 포괄.
  - 본문 템플릿:

    ```
    ## 요약
    <무엇을 왜 했는지 1~3줄>

    ## 변경 사항
    - <커밋/주요 변경 목록>

    ## 테스트
    - <확인 방법 / 관련 QA>

    ## 관련 명세 갱신
    - <갱신한 문서 경로> | 해당 없음(사유: <한 줄>)
    ```

  - **"관련 명세 갱신"은 생략 불가.** base 대비 diff(`git diff --name-only origin/<base>..HEAD`)에 코드 변경이 있으면, 관련 문서(`CLAUDE.md`·`.claude/glossary.md`·`docs/`)가 같은 브랜치에서 갱신됐는지 확인한다. 갱신이 없다면 왜 해당 없음인지 사유를 반드시 적는다("문서에 닿지 않는 변경" 등) — 빈칸·생략 금지.

  - 생성 명령:
    ```bash
    gh pr create --base <base> --head <현재브랜치> --assignee @me --title "<제목>" --body "<본문>"
    ```
  - 생성 직전 **제목·본문·base를 출력한다**. 기본은 **확인 없이 바로 생성**한다 — 잘못 만들면 닫으면 된다. 사용자가 확인을 요청했을 때만 멈춘다.

## 5. 결과 출력

생성/기존 PR의 **URL**을 출력한다.

> 참고
>
> - `gh` CLI 인증 필요(`gh auth status`). 미인증이면 오류를 그대로 알린다.
> - 이 커맨드는 push와 PR 생성까지만 한다(머지하지 않음).
