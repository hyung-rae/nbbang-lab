"use client";

import { useEffect, useRef, useState } from "react";
import { percent, won } from "@/lib/domain/format";
import { layoutTreemap, treemapLabelLevel, type CategoryRow } from "@/lib/domain/treemap";
import { cn } from "@/lib/utils";
import { CategoryDot, categoryBg } from "./parts";

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
  const dim = (c: string) => current !== null && current.category !== c;

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-3">
      <div ref={box} className="relative h-60 overflow-hidden rounded-[10px] bg-secondary md:h-[300px]" role="img" aria-label="분류별 지출 트리맵">
        {layoutTreemap(rows, size.w, size.h).map((c) => {
          const r = c.item;
          const w = c.w - GAP;
          const h = c.h - GAP;
          const level = treemapLabelLevel(w, h);
          return (
            <button
              key={r.category}
              type="button"
              aria-label={`${r.category} ${won(r.amount)} ${percent(r.amount, total)}`}
              aria-pressed={current?.category === r.category}
              onClick={() => toggle(r.category)}
              className={cn(
                "absolute flex flex-col items-start justify-start gap-px overflow-hidden rounded-md px-[9px] py-2 text-left leading-tight text-cat-ink transition-opacity",
                categoryBg(r.category),
                dim(r.category) && "opacity-30",
              )}
              style={{ left: c.x + GAP / 2, top: c.y + GAP / 2, width: Math.max(0, w), height: Math.max(0, h) }}
            >
              {level !== "none" && <span className="text-[13px] font-semibold whitespace-nowrap">{r.category}</span>}
              {level === "full" && (
                <span className="font-heading text-lg whitespace-nowrap tabular-nums">{won(r.amount)}</span>
              )}
              {(level === "full" || level === "pct") && (
                <span className="text-xs opacity-85">{percent(r.amount, total)}</span>
              )}
            </button>
          );
        })}
      </div>
      <p className="min-h-[1.4em] text-[13.5px]" aria-live="polite">
        {current ? (
          <>
            <CategoryDot category={current.category} className="mr-1 inline-block" />
            <strong>{current.category}</strong> · {current.count}건 · <strong className="tabular-nums">{won(current.amount)}</strong> (
            {percent(current.amount, total)})
          </>
        ) : (
          <>
            총 <strong className="tabular-nums">{won(total)}</strong> · {rows.length}개 분류
          </>
        )}
      </p>
      <ul className="flex flex-col">
        {rows.map((r, i) => (
          <li key={r.category}>
            <button
              type="button"
              aria-pressed={current?.category === r.category}
              onClick={() => toggle(r.category)}
              className={cn(
                "flex min-h-10 w-full items-center gap-2.5 px-1 py-1.5 text-left text-sm transition-opacity",
                i > 0 && "border-t border-border",
                dim(r.category) && "opacity-30",
              )}
            >
              <CategoryDot category={r.category} />
              <span className="min-w-0 flex-1">{r.category}</span>
              <span className="whitespace-nowrap tabular-nums">
                {won(r.amount)}
                <small className="ml-2 inline-block min-w-[3.2em] text-right text-muted-foreground">
                  {percent(r.amount, total)}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
