import { Container, Stack } from "@mantine/core";
import type { ReactNode } from "react";

/** 폰 폭 기준 한 줄 화면: 가운데 36rem, 좌우 16px */
export function PageShell({ children, pb = 40, gap = "lg" }: { children: ReactNode; pb?: number | string; gap?: number | string }) {
  return (
    <Container component="main" size="36rem" px="md" pt="sm" pb={pb} w="100%">
      <Stack gap={gap}>{children}</Stack>
    </Container>
  );
}
