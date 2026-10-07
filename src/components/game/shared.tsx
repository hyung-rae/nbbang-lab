"use client";

import { Button, Text, type ButtonProps } from "@mantine/core";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { filledColor, memberColor } from "@/components/trip/parts";
import classes from "./game.module.css";

/** requestAnimationFrame 으로 ms 동안 step(t: 0→1), 끝나면 done. 돌려받은 함수로 중단. 움직임 줄이기 설정이면 짧게 */
export function runAnimation(ms: number, step: (t: number) => void, done: () => void): () => void {
  if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) ms = Math.min(ms, 300);
  let stopped = false;
  let raf = 0;
  const t0 = performance.now();
  const frame = (now: number) => {
    if (stopped) return;
    const t = Math.max(0, Math.min(1, (now - t0) / ms));
    step(t);
    if (t < 1) raf = requestAnimationFrame(frame);
    else done();
  };
  raf = requestAnimationFrame(frame);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
  };
}

/** 멤버 색 → SVG fill 등에 쓸 CSS 값 */
export const memberFill = (color: number) => filledColor(memberColor(color));

export function GameDesc({ children }: { children: ReactNode }) {
  return (
    <Text size="sm" c="dimmed" ta="center" className={classes.desc}>
      {children}
    </Text>
  );
}

/** 게임 진행 버튼 (돌리기·폭탄 시작·넘기기) */
export function GoButton(props: ButtonProps & Omit<ComponentPropsWithoutRef<"button">, keyof ButtonProps>) {
  return <Button miw="11em" {...props} />;
}
