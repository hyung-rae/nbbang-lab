"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { OptionSelect } from "@/components/form/option-select";
import { SHOP_GROUPS, type ShopGroup } from "@/lib/domain/categories";
import type { ShoppingItem, TripData } from "@/lib/domain/types";
import { addShoppingItem, clearDoneShopping, deleteShoppingItem, setShoppingDone } from "@/lib/trips/actions";
import { shoppingSchema, firstError } from "@/lib/trips/schema";
import { cn } from "@/lib/utils";
import { ArmedButton, Empty, SectionTitle, btnGhost, btnPrimary, btnText, fieldClass, useAction } from "./parts";

export function ShopTab({ data, onRecordExpense }: { data: TripData; onRecordExpense: () => void }) {
  const { slug } = data;
  // 체크는 바로 반영해 보이고(낙관적), 서버 응답이 오면 실제 값으로 맞춘다
  const [items, setOptimistic] = useOptimistic(data.shopping, (list: ShoppingItem[], u: { id: string; done: boolean }) =>
    list.map((x) => (x.id === u.id ? { ...x, done: u.done } : x)),
  );
  const [, startToggle] = useTransition();
  const [name, setName] = useState("");
  const [group, setGroup] = useState<ShopGroup>("고기");
  const [error, setError] = useState("");
  const { pending, run } = useAction();

  const done = items.filter((x) => x.done).length;

  function toggle(id: string, next: boolean) {
    startToggle(async () => {
      setOptimistic({ id, done: next });
      const r = await setShoppingDone(slug, id, next);
      if (!r.ok) toast.error(r.error);
    });
  }

  function add() {
    const parsed = shoppingSchema.safeParse({ name, group });
    if (!parsed.success) {
      setError(firstError(parsed.error));
      return;
    }
    setError("");
    run(() => addShoppingItem(slug, { name, group }), {
      onSuccess: () => {
        setName("");
        document.getElementById("s-name")?.focus();
      },
      onError: setError,
    });
  }

  return (
    <section className="flex flex-col gap-2.5">
      <SectionTitle count={items.length ? `${items.length}개` : undefined}>장볼 것</SectionTitle>
      {items.length > 0 && (
        <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground tabular-nums">
          <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-border">
            <i
              className="block h-full rounded-[3px] bg-primary transition-[width]"
              style={{ width: `${Math.round((done / items.length) * 100)}%` }}
            />
          </span>
          <span>
            {done} / {items.length} 담음
          </span>
        </div>
      )}

      <form
        noValidate
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <OptionSelect
          id="s-group"
          aria-label="분류"
          value={group}
          options={SHOP_GROUPS}
          onChange={setGroup}
          className="w-auto! flex-[0_0_8em] pr-2"
        />
        <label className="sr-only" htmlFor="s-name">
          살 것
        </label>
        <input
          id="s-name"
          maxLength={30}
          autoComplete="off"
          placeholder="살 것 (예: 삼겹살)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(fieldClass, "flex-1")}
        />
        <button type="submit" className={btnPrimary} disabled={pending}>
          추가
        </button>
      </form>
      {error && <p className="text-[13px] font-medium text-minus">{error}</p>}

      {!items.length ? (
        <Empty title="아직 장볼 목록이 없어요">
          <p>위에서 살 것을 하나씩 추가해 보세요.</p>
        </Empty>
      ) : (
        <div className="flex flex-col gap-[18px]">
          {SHOP_GROUPS.map((g) => {
            const list = items.filter((x) => x.group === g);
            if (!list.length) return null;
            const gd = list.filter((x) => x.done).length;
            // 분류 안에서는 안 담은 것 먼저
            const sorted = [...list.filter((x) => !x.done), ...list.filter((x) => x.done)];
            return (
              <section key={g} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2 px-1">
                  <h3 className={cn("text-sm font-semibold", gd === list.length && "text-muted-foreground")}>{g}</h3>
                  <span className="text-[13px] text-muted-foreground tabular-nums">
                    {gd} / {list.length}
                  </span>
                </div>
                <ul className="overflow-hidden rounded-[14px] border border-border bg-card">
                  {sorted.map((x, i) => (
                    <li key={x.id} className={cn("flex items-center gap-1 pr-1.5", i > 0 && "border-t border-border")}>
                      <label className="group/check relative flex min-h-[52px] min-w-0 flex-1 cursor-pointer items-center gap-3 py-2 pr-1.5 pl-3.5">
                        <input
                          type="checkbox"
                          checked={x.done}
                          onChange={(e) => toggle(x.id, e.target.checked)}
                          className="peer pointer-events-none absolute opacity-0"
                        />
                        <span
                          aria-hidden
                          className="grid size-6 flex-none place-items-center rounded-full border-2 border-border text-[13px] leading-none font-bold text-transparent peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
                        >
                          ✓
                        </span>
                        <span className="min-w-0 flex-1 peer-checked:text-muted-foreground peer-checked:line-through">
                          {x.name}
                        </span>
                      </label>
                      <ArmedButton
                        armedLabel="삭제"
                        aria-label={`${x.name} 지우기`}
                        className={cn(btnText, "min-w-10 text-lg font-medium text-minus")}
                        onConfirm={() => run(() => deleteShoppingItem(slug, x.id))}
                      >
                        ×
                      </ArmedButton>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {done > 0 && (
            <ArmedButton
              armedLabel="한 번 더 누르면 지워요"
              className={btnGhost}
              disabled={pending}
              onConfirm={() => run(() => clearDoneShopping(slug), { success: "담은 것을 지웠어요" })}
            >
              담은 것 지우기
            </ArmedButton>
          )}
          {data.members.length > 0 && (
            <button type="button" className={btnGhost} onClick={onRecordExpense}>
              장본 금액 지출로 기록
            </button>
          )}
        </div>
      )}
    </section>
  );
}
