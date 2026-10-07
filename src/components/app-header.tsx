"use client";

import { ActionIcon, Group, Text, UnstyledButton } from "@mantine/core";
import { List, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { logout } from "@/lib/auth/actions";
import { SITE_NAME } from "@/lib/site";
import classes from "./app-header.module.css";

/** 모든 화면 위쪽 앱 바: 왼쪽 엔빵 로고(홈), 오른쪽 여행 목록 (+ 관리자면 로그아웃). 여행 링크 복사는 여행 티켓 오른쪽 위 */
export function AppHeader({ current, admin = false }: { current?: "trips"; admin?: boolean }) {
  return (
    <Group component="header" justify="space-between" gap="xs" mih={44}>
      <UnstyledButton component={Link} href="/" display="flex" style={{ alignItems: "center", gap: 8 }}>
        <Image src="/icon-192.png" alt="" width={30} height={30} priority className={classes.logo} />
        <Text fw={700} fz={22} lh={1}>
          {SITE_NAME}
        </Text>
      </UnstyledButton>
      <Group gap={6} wrap="nowrap">
      {admin && (
        <form action={logout}>
          <ActionIcon type="submit" aria-label="관리자 로그아웃" title="관리자 로그아웃" variant="default" size="input-sm" radius="md">
            <LogOut aria-hidden size={18} />
          </ActionIcon>
        </form>
      )}
      <ActionIcon
        component={Link}
        href="/trips"
        aria-label="여행 목록"
        title="여행 목록"
        aria-current={current === "trips" ? "page" : undefined}
        variant="default"
        size="input-sm"
        radius="md"
      >
        <List aria-hidden size={18} />
      </ActionIcon>
      </Group>
    </Group>
  );
}
