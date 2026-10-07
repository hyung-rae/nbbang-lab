"use client";

import { Button, Group, PasswordInput } from "@mantine/core";
import { useState, useTransition } from "react";
import { enterTrip } from "@/lib/auth/actions";

/**
 * 여행 입장 비밀번호 칸 — 목록의 입장 창과 여행 링크의 입장 화면이 같이 쓴다.
 * 서버(enterTrip)가 확인하고 입장 표(쿠키)를 준다. 맞으면 onEntered — 이동·새로고침은 부르는 쪽이 정한다
 */
export function TripPasswordForm({
  slug,
  onEntered,
  onCancel,
}: {
  slug: string;
  onEntered: () => void;
  onCancel?: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // 확인 + 이동(onEntered 안의 router 이동)이 끝날 때까지 버튼을 돌린다
  const [pending, startTransition] = useTransition();

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!password.trim()) return setError("비밀번호를 입력해 주세요.");
        setError("");
        startTransition(async () => {
          const r = await enterTrip(slug, password);
          if (r.ok) onEntered();
          else setError(r.error);
        });
      }}
    >
      <PasswordInput
        aria-label="입장 비밀번호"
        autoComplete="off"
        data-autofocus
        autoFocus={!onCancel}
        value={password}
        onChange={(e) => {
          setPassword(e.currentTarget.value);
          if (error) setError("");
        }}
        error={error || undefined}
      />
      <Group justify="flex-end" gap="xs" mt="lg">
        {onCancel && (
          <Button variant="default" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button type="submit" loading={pending}>
          입장
        </Button>
      </Group>
    </form>
  );
}
