"use client";

import { Box, Paper, Text, UnstyledButton } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { percent, won } from "@/lib/domain/format";
import { layoutTreemap, treemapLabelLevel, type CategoryRow } from "@/lib/domain/treemap";
import { CategoryDot, INK_ON_FILLED, categoryColor, filledColor } from "./parts";
import classes from "./treemap.module.css";

const GAP = 2;

/** 어디에 썼나 — 분류별 지출 트리맵 + 아래 목록. 칸이나 목록을 누르면 그 분류만 강조 */
export function Treemap({ rows, total }: { rows: CategoryRow[]; total: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const current = rows.find((r) => r.category === selected) ?? null;
  const toggle = (c: string) => setSelected((s) => (s === c ? null : c));
  const dim = (c: string) => (current !== null && current.category !== c ? classes.dim : "");

  return (
    <Paper withBorder radius="lg" p="sm">
      <div ref={box} className={classes.box} role="img" aria-label="분류별 지출 트리맵">
        {layoutTreemap(rows, size.w, size.h).map((c) => {
          const r = c.item;
          const w = c.w - GAP;
          const h = c.h - GAP;
          const level = treemapLabelLevel(w, h);
          const color = categoryColor(r.category);
          return (
            <UnstyledButton
              key={r.category}
              aria-label={`${r.category} ${won(r.amount)} ${percent(r.amount, total)}`}
              aria-pressed={current?.category === r.category}
              onClick={() => toggle(r.category)}
              className={`${classes.cell} ${dim(r.category)}`}
              style={{
                left: c.x + GAP / 2,
                top: c.y + GAP / 2,
                width: Math.max(0, w),
                height: Math.max(0, h),
                backgroundColor: filledColor(color),
                color: INK_ON_FILLED,
              }}
            >
              {level !== "none" && <Text span size="sm" fw={600} c="inherit">{r.category}</Text>}
              {level === "full" && <Text span fz={18} fw={700} c="inherit">{won(r.amount)}</Text>}
              {(level === "full" || level === "pct") && <Text span size="xs" opacity={0.85} c="inherit">{percent(r.amount, total)}</Text>}
            </UnstyledButton>
          );
        })}
      </div>
      <Text size="sm" mih="1.4em" my="sm" aria-live="polite">
        {current ? (
          <>
            <CategoryDot category={current.category} /> <strong>{current.category}</strong> · {current.count}건 ·{" "}
            <strong>{won(current.amount)}</strong> ({percent(current.amount, total)})
          </>
        ) : (
          <>
            총 <strong>{won(total)}</strong> · {rows.length}개 분류
          </>
        )}
      </Text>
      <Box component="ul" m={0} p={0} style={{ listStyle: "none" }}>
        {rows.map((r) => (
          <li key={r.category} className={`${classes.item} ${dim(r.category)}`}>
            <UnstyledButton aria-pressed={current?.category === r.category} onClick={() => toggle(r.category)} className={classes.row}>
              <CategoryDot category={r.category} />
              <Text span size="sm" flex={1} miw={0}>
                {r.category}
              </Text>
              <Text span size="sm" style={{ whiteSpace: "nowrap" }}>
                {won(r.amount)}
                <Text span size="xs" c="dimmed" ml={8} display="inline-block" miw="3.2em" ta="right">
                  {percent(r.amount, total)}
                </Text>
              </Text>
            </UnstyledButton>
          </li>
        ))}
      </Box>
    </Paper>
  );
}
