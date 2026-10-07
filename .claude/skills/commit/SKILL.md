---
name: commit
model: sonnet
description: 커밋 컨벤션(gitmoji)에 맞춰 커밋할 때 사용. 사용자가 /commit 또는 "커밋해줘"라고 하면 — 형식·절차의 정본인 .claude/commands/git/commit.md 를 읽고 그대로 따른다(분할·계획 출력 후 확인 없이 진행·브랜치 가드 포함).
---

# /commit — 커밋 (정본 위임)

커밋 컨벤션·절차의 **정본은 `.claude/commands/git/commit.md`** 다. 이 스킬은 자연어 트리거("커밋해줘", "커밋 남겨줘")를 그 정본으로 연결만 한다.

1. `.claude/commands/git/commit.md` 를 읽는다.
2. 커밋 전에 `.claude/review-rules.md` 의 **W-003(리뷰 여부 묻기)·W-004(문서 최신화)** 를 수행한다.
3. 정본 절차(변경 파악 → 단위 분할 → 계획 표 출력 → 커밋 → 보고)를 그대로 수행한다. **기본은 확인 없이 진행** — 멈추는 예외는 정본 3단계에 정의돼 있다(force-push류, 사용자 요청, 분할 기준 불확실).
4. push까지 원하면("커밋하고 푸시/올려줘") `/git:ship` 절차를 따른다.
