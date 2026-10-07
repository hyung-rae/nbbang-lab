"use client";

import { ActionIcon, Group, Text, UnstyledButton } from "@mantine/core";
import { List } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import classes from "./app-header.module.css";

/** 모든 화면 위쪽 앱 바: 왼쪽 엔빵 로고(홈), 오른쪽 여행 목록 */
export function AppHeader({ current }: { current?: "trips" }) {
  return (
    <Group component="header" justify="space-between" gap="xs" mih={44}>
      <UnstyledButton component={Link} href="/" display="flex" style={{ alignItems: "center", gap: 8 }}>
        <Image src="/icon-192.png" alt="" width={30} height={30} priority className={classes.logo} />
        <Text fw={700} fz={22} lh={1}>
          {SITE_NAME}
        </Text>
      </UnstyledButton>
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
  );
}
