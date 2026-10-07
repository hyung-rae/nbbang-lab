"use client";

import { Paper, Text, Title } from "@mantine/core";
import { useRouter } from "next/navigation";
import { TripPasswordForm } from "./trip-password-form";

/** 여행 링크로 들어왔는데 입장 표가 없을 때 여행 화면 대신 보이는 입장 화면. 맞으면 같은 주소를 새로 받아 여행 화면이 뜬다 */
export function TripGate({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  return (
    <Paper withBorder radius="lg" p="lg">
      <Title order={1} size="h3">
        {name}
      </Title>
      <Text size="sm" c="dimmed" mt={4} mb="md">
        관리자에게 받은 입장 비밀번호를 입력해 주세요. 한 번 들어오면 이 기기에서는 30일 동안 다시 묻지 않아요.
      </Text>
      <TripPasswordForm slug={slug} onEntered={() => router.refresh()} />
    </Paper>
  );
}
