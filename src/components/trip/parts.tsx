"use client";

import { useEffect, useRef, useState, useTransition, type ComponentProps, type ReactNode } from "react";
import { toast } from "sonner";
import { categoryIndex } from "@/lib/domain/categories";
import type { Member } from "@/lib/domain/types";
import type { ActionResult } from "@/lib/trips/actions";
import { cn } from "@/lib/utils";

// Tailwind 는 클래스 이름을 정적으로 찾으므로 색 클래스는 목록으로 둔다
const MEMBER_BG = ["bg-m0", "bg-m1", "bg-m2", "bg-m3", "bg-m4", "bg-m5"];
const CATEGORY_BG = ["bg-cat-0", "bg-cat-1", "bg-cat-2", "bg-cat-3", "bg-cat-4", "bg-cat-5", "bg-cat-6"];

export function memberBg(color: number) {
  return MEMBER_BG[((color % 6) + 6) % 6];
}

export function categoryBg(category: string) {
  return CATEGORY_BG[categoryIndex(category)];
}

export function Avatar({ member, className }: { member: Member | undefined; className?: string }) {
  if (!member) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-[30px] flex-none place-items-center rounded-full text-[13px] leading-none font-semibold text-av-ink",
        memberBg(member.color),
        className,
      )}
    >
      {Array.from(member.name)[0] ?? "?"}
    </span>
  );
}

export function CategoryDot({ category, className }: { category: string; className?: string }) {
  return <span aria-hidden className={cn("size-2.5 flex-none rounded-full", categoryBg(category), className)} />;
}

/** 라디오·체크박스 칩. 선택 상태는 색 + "✓" 로 같이 보여 준다 (명세 디자인 절) */
export function Chip({
  children,
  className,
  ...input
}: ComponentProps<"input"> & { children: ReactNode }) {
  return (
    <label
      className={cn(
        "relative inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-secondary py-0 pr-3 pl-1.5 font-medium select-none",
        "has-[input:checked]:border-primary has-[input:checked]:bg-accent has-[input:checked]:text-accent-foreground",
        "has-[input:checked]:after:text-xs has-[input:checked]:after:font-bold has-[input:checked]:after:content-['✓']",
        "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-primary",
        "has-[input:disabled]:cursor-default has-[input:disabled]:opacity-60",
        className,
      )}
    >
      <input {...input} className="pointer-events-none absolute opacity-0" />
      {children}
    </label>
  );
}

export function SectionTitle({ children, count }: { children: ReactNode; count?: ReactNode }) {
  return (
    <h2 className="m-0 flex items-baseline gap-2 font-heading text-[22px] leading-tight font-normal">
      {children}
      {count != null && <span className="font-sans text-[13px] text-muted-foreground">{count}</span>}
    </h2>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-border px-5 py-10 text-center text-muted-foreground">
      <p className="font-heading text-xl text-foreground">{title}</p>
      {children}
    </div>
  );
}

/**
 * 위험 동작(삭제·빼기)은 두 번 눌러야 실행한다: 첫 클릭에 빨간 "한 번 더 누르면 …", 3초 뒤 원래대로.
 * 아티팩트판은 confirm() 이 막혀서 택한 방식이지만 폰에서 실수 방지에 좋아 그대로 쓴다.
 */
export function ArmedButton({
  armedLabel,
  onConfirm,
  className,
  children,
  ...props
}: Omit<ComponentProps<"button">, "onClick"> & { armedLabel: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      {...props}
      data-armed={armed || undefined}
      className={cn(className, "data-armed:border-minus data-armed:bg-minus data-armed:text-on-danger")}
      onClick={() => {
        if (armed) {
          clearTimeout(timer.current);
          setArmed(false);
          onConfirm();
          return;
        }
        setArmed(true);
        timer.current = setTimeout(() => setArmed(false), 3000);
      }}
    >
      {armed ? armedLabel : children}
    </button>
  );
}

/** 클립보드 복사. 막힌 환경이면 false — 호출한 쪽에서 선택된 textarea 로 대신 보여 준다 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function CopyFallback({ id, text, label }: { id: string; text: string; label: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.select(), [text]);
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        readOnly
        rows={6}
        value={text}
        className="w-full resize-y rounded-[10px] border border-border bg-secondary p-2.5 text-sm"
      />
      <p className="text-[12.5px] text-muted-foreground">
        자동 복사가 안 되는 화면이라 내용을 선택해 뒀어요. 길게 눌러 복사하세요.
      </p>
    </>
  );
}

/** Server Action 실행: 실패 문구는 토스트(또는 onError), 성공 문구는 토스트 */
export function useAction() {
  const [pending, startTransition] = useTransition();
  function run(
    fn: () => Promise<ActionResult>,
    opts: { success?: string; onSuccess?: () => void; onError?: (message: string) => void } = {},
  ) {
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        if (opts.success) toast(opts.success);
        opts.onSuccess?.();
      } else if (opts.onError) opts.onError(r.error);
      else toast.error(r.error);
    });
  }
  return { pending, run };
}

export const fieldClass =
  "w-full min-w-0 min-h-[46px] rounded-[10px] border border-border bg-secondary px-3 outline-none focus:border-primary focus:ring-3 focus:ring-accent";
export const labelClass = "text-[13px] font-semibold text-muted-foreground";
export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 font-semibold whitespace-nowrap text-primary-foreground disabled:opacity-60";
export const btnGhost =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 font-semibold whitespace-nowrap disabled:opacity-60";
export const btnText =
  "min-h-10 rounded-lg px-2.5 font-semibold whitespace-nowrap text-muted-foreground disabled:opacity-60";
