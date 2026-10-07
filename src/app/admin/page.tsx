import { Stack } from "@mantine/core";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { LoginForm } from "@/components/auth/login-form";
import { PageShell } from "@/components/page-shell";
import { SectionTitle } from "@/components/trip/parts";
import { isAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "관리자 로그인", robots: { index: false } };

/** 관리자 로그인 — 화면 어디에도 링크가 없고 관리자가 주소(/admin)를 직접 친다 (2026-10-07 사용자 결정) */
export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/");
  return (
    <PageShell>
      <AppHeader />
      <Stack gap="sm">
        <SectionTitle>관리자 로그인</SectionTitle>
        <LoginForm />
      </Stack>
    </PageShell>
  );
}
