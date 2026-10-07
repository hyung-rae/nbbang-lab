"use client";

import { Group, Select } from "@mantine/core";
import type { ReactNode } from "react";

/** 브라우저 기본 select 대신 Mantine Select. 옵션 값이 곧 화면 글자인 목록(분류 등)용. icon 은 목록과 입력칸 왼쪽에 함께 보인다 */
export function OptionSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  icon,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  label?: ReactNode;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  icon?: (value: T) => ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Select
      id={id}
      label={label}
      aria-label={ariaLabel}
      className={className}
      data={options as readonly string[] as string[]}
      value={value}
      onChange={(v) => v && onChange(v as T)}
      allowDeselect={false}
      checkIconPosition="right"
      leftSection={icon?.(value)}
      renderOption={({ option }) => (
        <Group gap="xs" wrap="nowrap">
          {icon?.(option.value as T)}
          {option.label}
        </Group>
      )}
      comboboxProps={{ position: "bottom-start" }}
    />
  );
}
