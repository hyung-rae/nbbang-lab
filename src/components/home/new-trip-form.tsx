"use client";

import { useState, useTransition } from "react";
import { DateRangePicker } from "@/components/form/date-picker";
import { btnPrimary, fieldClass, labelClass } from "@/components/trip/parts";
import { createTrip } from "@/lib/trips/actions";
import { firstError, newTripSchema } from "@/lib/trips/schema";

export function NewTripForm() {
  const [form, setForm] = useState({ name: "", start: "", end: "" });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <form
      noValidate
      className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = newTripSchema.safeParse(form);
        // 날짜 규칙(종료일 < 시작일 등)도 newTripSchema 안에 있다
        if (!parsed.success) return setError(firstError(parsed.error));
        setError("");
        // 성공하면 서버가 새 여행 링크로 이동시킨다
        startTransition(async () => {
          const r = await createTrip(form);
          if (!r.ok) setError(r.error);
        });
      }}
    >
      <label className="flex flex-col gap-1.5" htmlFor="n-name">
        <span className={labelClass}>여행 이름</span>
        <input
          id="n-name"
          maxLength={30}
          autoComplete="off"
          placeholder="예: 26년 가을 가평"
          value={form.name}
          onChange={set("name")}
          className={fieldClass}
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="n-dates">
          여행 날짜
        </label>
        <DateRangePicker id="n-dates" start={form.start} end={form.end} onChange={(start, end) => setForm({ ...form, start, end })} />
      </div>
      {error && <p className="text-[13px] font-medium text-minus">{error}</p>}
      <div>
        <button type="submit" className={btnPrimary} disabled={pending}>
          {pending ? "만드는 중…" : "여행 만들기"}
        </button>
      </div>
    </form>
  );
}
