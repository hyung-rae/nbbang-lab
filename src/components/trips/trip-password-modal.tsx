"use client";

import { Button, Group, Modal, PasswordInput, Text } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * 여행 입장 비밀번호 — 지금은 모든 여행이 같은 값(사용자 결정 2026-10-07, 여행별 비밀번호 기능을 만들면 바꾼다).
 * 브라우저에서만 확인하는 화면용 관문이라 보호가 아니다: 이 값은 공개 번들·저장소에 보이고, 여행 링크(`/t/<slug>`)로는 그대로 들어간다.
 */
const TRIP_PASSWORD = "1111";

/** 여행 목록에서 여행을 누르면 뜨는 비밀번호 창. 맞으면 그 여행으로 이동 */
export function TripPasswordModal({
  trip,
  opened,
  onClose,
}: {
  trip: { slug: string; name: string } | null;
  opened: boolean;
  onClose: () => void;
}) {
  return (
    <Modal opened={opened} onClose={onClose} title="여행 입장" centered radius="lg" closeButtonProps={{ "aria-label": "닫기" }}>
      {/* 닫히면 내용이 언마운트돼 입력·오류가 비워진다 */}
      {trip && <PasswordForm trip={trip} onCancel={onClose} />}
    </Modal>
  );
}

function PasswordForm({ trip, onCancel }: { trip: { slug: string; name: string }; onCancel: () => void }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // 이동이 끝나거나 실패하면 pending 이 풀린다 (상태로 들면 이동 실패 때 버튼이 계속 돈다)
  const [entering, startEntering] = useTransition();

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!password) return setError("비밀번호를 입력해 주세요.");
        if (password !== TRIP_PASSWORD) return setError("비밀번호가 맞지 않아요.");
        setError("");
        startEntering(() => router.push(`/t/${trip.slug}`));
      }}
    >
      <Text size="sm" mb="sm">
        <strong>{trip.name}</strong> 여행의 입장 비밀번호를 입력해 주세요.
      </Text>
      <PasswordInput
        aria-label="입장 비밀번호"
        inputMode="numeric"
        autoComplete="off"
        data-autofocus
        value={password}
        onChange={(e) => {
          setPassword(e.currentTarget.value);
          if (error) setError("");
        }}
        error={error || undefined}
      />
      <Group justify="flex-end" gap="xs" mt="lg">
        <Button variant="default" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" loading={entering}>
          입장
        </Button>
      </Group>
    </form>
  );
}
