"use client";

import { Modal, Text } from "@mantine/core";
import { useRouter } from "next/navigation";
import { TripPasswordForm } from "./trip-password-form";

/** 여행 목록에서 비밀번호가 있는(아직 안 들어간) 여행을 누르면 뜨는 창. 맞으면 그 여행으로 이동 */
export function TripPasswordModal({
  trip,
  opened,
  onClose,
}: {
  trip: { slug: string; name: string } | null;
  opened: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  return (
    <Modal opened={opened} onClose={onClose} title="여행 입장" centered radius="lg" closeButtonProps={{ "aria-label": "닫기" }}>
      {/* 닫히면 내용이 언마운트돼 입력·오류가 비워진다 */}
      {trip && (
        <>
          <Text size="sm" mb="sm">
            <strong>{trip.name}</strong> 여행의 입장 비밀번호를 입력해 주세요.
          </Text>
          <TripPasswordForm slug={trip.slug} onEntered={() => router.push(`/t/${trip.slug}`)} onCancel={onClose} />
        </>
      )}
    </Modal>
  );
}
