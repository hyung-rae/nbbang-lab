"use client";

import Link from "next/link";
import { DateRangePicker } from "@/components/form/date-picker";
import { useState } from "react";
import { toast } from "sonner";
import { usageCount } from "@/lib/domain/expense-view";
import type { TripData } from "@/lib/domain/types";
import { addMember, removeMember, updateTripInfo } from "@/lib/trips/actions";
import { MAX_MEMBERS, firstError, memberNameSchema, tripInfoSchema } from "@/lib/trips/schema";
import { cn } from "@/lib/utils";
import {
  ArmedButton,
  Avatar,
  CopyFallback,
  SectionTitle,
  btnGhost,
  btnPrimary,
  btnText,
  copyText,
  fieldClass,
  labelClass,
  useAction,
} from "./parts";

export function SettingsTab({ data }: { data: TripData }) {
  return (
    <>
      <TripForm data={data} />
      <Members data={data} />
      <Share data={data} />
    </>
  );
}

type TripFields = { name: string; start: string; end: string; address: string };

/*
 * 고친 칸만 edits 에 들고, 안 고친 칸은 항상 지금 값(data.trip)을 보여 준다.
 * 다른 사람이 이름을 바꾼 뒤 내가 주소만 고쳐 저장해도 그 이름을 옛 값으로 되돌리지 않는다.
 */
function TripForm({ data }: { data: TripData }) {
  const t = data.trip;
  const current: TripFields = { name: t.name, start: t.start ?? "", end: t.end ?? "", address: t.address ?? "" };
  const [edits, setEdits] = useState<Partial<TripFields>>({});
  const form: TripFields = { ...current, ...edits };
  const setForm = (next: TripFields) =>
    setEdits(Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== current[k as keyof TripFields])));
  const [error, setError] = useState("");
  const { pending, run } = useAction();
  const set = (k: keyof TripFields) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  function submit() {
    const parsed = tripInfoSchema.safeParse(form);
    if (!parsed.success) {
      setError(firstError(parsed.error));
      return;
    }
    const p = parsed.data;
    if (p.name === t.name && p.start === t.start && p.end === t.end && p.address === t.address) {
      toast("바뀐 내용이 없어요");
      return;
    }
    setError("");
    run(() => updateTripInfo(data.slug, form), {
      success: "여행 정보를 반영했어요",
      onSuccess: () => setEdits({}),
      onError: setError,
    });
  }

  return (
    <section className="flex flex-col gap-2.5">
      <SectionTitle>여행 정보</SectionTitle>
      <form
        noValidate
        className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="flex flex-col gap-1.5" htmlFor="t-name">
          <span className={labelClass}>여행 이름</span>
          <input id="t-name" maxLength={30} autoComplete="off" value={form.name} onChange={set("name")} className={fieldClass} />
        </label>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="t-dates">
            여행 날짜
          </label>
          <DateRangePicker id="t-dates" start={form.start} end={form.end} onChange={(start, end) => setForm({ ...form, start, end })} />
        </div>
        <label className="flex flex-col gap-1.5" htmlFor="t-address">
          <span className={labelClass}>숙소 주소</span>
          <input
            id="t-address"
            maxLength={100}
            autoComplete="off"
            placeholder="예: 경기 가평군 설악면 …"
            value={form.address}
            onChange={set("address")}
            className={fieldClass}
          />
        </label>
        {error && <p className="text-[13px] font-medium text-minus">{error}</p>}
        <div>
          <button type="submit" className={btnPrimary} disabled={pending}>
            여행 정보 반영
          </button>
        </div>
      </form>
    </section>
  );
}

function Members({ data }: { data: TripData }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const { pending, run } = useAction();

  function add() {
    const parsed = memberNameSchema.safeParse(name);
    const msg = !parsed.success
      ? firstError(parsed.error)
      : data.members.length >= MAX_MEMBERS
        ? `최대 ${MAX_MEMBERS}명까지 추가할 수 있어요.`
        : data.members.some((m) => m.name === parsed.data)
          ? "같은 이름이 이미 있어요. 구별되게 적어 주세요."
          : "";
    if (msg) {
      setError(msg);
      return;
    }
    setError("");
    run(() => addMember(data.slug, name), {
      onSuccess: () => {
        setName("");
        document.getElementById("m-name")?.focus();
      },
      onError: setError,
    });
  }

  return (
    <section className="flex flex-col gap-2.5">
      <SectionTitle count={`${data.members.length}명`}>함께 가는 사람</SectionTitle>
      <ul className="overflow-hidden rounded-[14px] border border-border bg-card">
        {data.members.length ? (
          data.members.map((m, i) => {
            const used = usageCount(m.id, data.expenses);
            return (
              <li key={m.id} className={cn("flex min-h-14 items-center gap-2.5 py-2 pr-2.5 pl-3.5", i > 0 && "border-t border-border")}>
                <Avatar member={m} />
                <span className="min-w-0 flex-1 font-semibold">{m.name}</span>
                {used ? (
                  <span className="text-[12.5px] text-muted-foreground">지출 {used}건에 포함</span>
                ) : (
                  <ArmedButton
                    armedLabel="한 번 더 누르면 빼요"
                    disabled={pending}
                    className={cn(btnText, "text-minus")}
                    onConfirm={() => run(() => removeMember(data.slug, m.id), { success: `${m.name} 뺐어요` })}
                  >
                    빼기
                  </ArmedButton>
                )}
              </li>
            );
          })
        ) : (
          <li className="p-3.5 text-sm text-muted-foreground">아직 아무도 없어요. 아래에서 이름을 추가하세요.</li>
        )}
      </ul>
      <form
        noValidate
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label className="sr-only" htmlFor="m-name">
          친구 이름
        </label>
        <input
          id="m-name"
          maxLength={10}
          placeholder="친구 이름"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(fieldClass, "flex-1")}
        />
        <button type="submit" className={btnPrimary} disabled={pending}>
          추가
        </button>
      </form>
      {error && <p className="text-[13px] font-medium text-minus">{error}</p>}
      <p className="text-[12.5px] text-muted-foreground">
        지출에 들어간 사람은 뺄 수 없어요. 그 지출을 먼저 고치거나 지워 주세요.
      </p>
    </section>
  );
}

function Share({ data }: { data: TripData }) {
  const [fallback, setFallback] = useState("");
  const url = () => `${location.origin}/t/${data.slug}`;
  return (
    <section className="flex flex-col gap-2.5">
      <SectionTitle>친구들과 공유</SectionTitle>
      <p className="-mt-1 text-[13px] text-muted-foreground">
        입력하면 바로 저장돼요. 이 여행 링크를 친구들에게 보내면 로그인 없이 같이 보고 입력할 수 있어요.{" "}
        <strong>링크를 아는 사람은 누구나 고칠 수 있으니</strong> 함께 가는 사람에게만 보내 주세요.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btnGhost}
          onClick={async () => {
            if (await copyText(url())) {
              setFallback("");
              toast("링크를 복사했어요");
            } else setFallback(url());
          }}
        >
          링크 복사
        </button>
        <button
          type="button"
          className={btnGhost}
          onClick={async () => {
            if (!navigator.share) {
              if (await copyText(url())) toast("링크를 복사했어요");
              else setFallback(url());
              return;
            }
            try {
              await navigator.share({ title: data.trip.name, url: url() });
            } catch {
              /* 사용자가 공유 창을 닫음 */
            }
          }}
        >
          공유하기
        </button>
        <Link href="/trips" className={cn(btnGhost, "ml-auto")}>
          다른 여행
        </Link>
      </div>
      {fallback && <CopyFallback id="share-copy" text={fallback} label="여행 링크" />}
    </section>
  );
}
