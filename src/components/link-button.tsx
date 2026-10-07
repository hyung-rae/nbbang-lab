"use client";

import { ActionIcon, Button, type ActionIconProps, type ButtonProps } from "@mantine/core";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

type LinkProps = ComponentPropsWithoutRef<typeof Link>;

// 서버 컴포넌트는 `Button component={Link}` 처럼 컴포넌트를 prop 으로 넘길 수 없어서 여기서 묶는다

/** 버튼 모양 링크 */
export function LinkButton(props: ButtonProps & Omit<LinkProps, keyof ButtonProps>) {
  return <Button component={Link} {...props} />;
}

/** 아이콘 버튼 모양 링크. 글자가 없으니 aria-label 을 꼭 준다 */
export function LinkActionIcon(props: ActionIconProps & Omit<LinkProps, keyof ActionIconProps> & { "aria-label": string }) {
  return <ActionIcon component={Link} size="input-sm" radius="md" title={props["aria-label"]} {...props} />;
}
