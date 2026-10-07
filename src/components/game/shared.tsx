"use client";

import { cn } from "@/lib/utils";

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

export const memberFill = (color: number) => `var(--m${((color % 6) + 6) % 6})`;

export function GameDesc({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-center text-[13.5px] text-muted-foreground [&_strong]:text-foreground", className)}>{children}</p>;
}

export const goButton =
  "inline-flex min-h-[52px] min-w-[11em] items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-60";
