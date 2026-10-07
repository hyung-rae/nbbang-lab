"use client";

import { Button, Group, Paper, PasswordInput, Stack, Text } from "@mantine/core";
import { useState, useTransition } from "react";
import { login } from "@/lib/auth/actions";

/** 관리자 비밀번호 한 칸. 맞으면 서버가 쿠키를 주고 홈으로 이동시킨다 */
export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <Paper
      component="form"
      noValidate
      withBorder
      radius="lg"
      p="md"
      onSubmit={(e) => {
        e.preventDefault();
        if (!password) return setError("비밀번호를 입력해 주세요.");
        setError("");
        startTransition(async () => {
          // 성공하면 redirect 로 이동한다 — 그때 결과가 비어(undefined) 돌아올 수 있어 확인한다
          const r = await login(password);
          if (r) setError(r.error);
        });
      }}
    >
      <Stack gap="sm">
        <PasswordInput
          id="admin-password"
          label="관리자 비밀번호"
          autoComplete="current-password"
          data-autofocus
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          error={error || undefined}
        />
        <Group>
          <Button type="submit" loading={pending}>
            로그인
          </Button>
        </Group>
        <Text size="xs" c="dimmed">
          여행에 참여하는 친구는 로그인 없이 받은 여행 링크로 들어가면 돼요.
        </Text>
      </Stack>
    </Paper>
  );
}
