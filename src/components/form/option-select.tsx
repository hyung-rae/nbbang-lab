"use client";

import type { ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** 브라우저 기본 select 대신 shadcn Select. 옵션 값이 곧 화면 글자인 목록(분류 등)용 */
export function OptionSelect<T extends string>({
  id,
  value,
  options,
  onChange,
  renderOption,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  renderOption?: (value: T) => ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v as T)}>
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "h-auto! min-h-[46px] w-full min-w-0 rounded-[10px] border-border bg-secondary px-3 text-base focus-visible:border-primary focus-visible:ring-accent data-popup-open:border-primary",
          className,
        )}
      >
        <SelectValue>{(v: T) => (renderOption ? renderOption(v) : v)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="min-h-10 text-base">
            {renderOption ? renderOption(o) : o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
