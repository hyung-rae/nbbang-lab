import { z } from "zod";
import { CATEGORIES, SHOP_GROUPS } from "@/lib/domain/categories";

// 입력 검증 — 화면(즉시 안내)과 Server Action(최종 검증)이 같이 쓴다. 문구는 명세 "입력 상세" 절.

export const MAX_MEMBERS = 12;
export const MAX_SHOPPING = 80;
export const MAX_AMOUNT = 100_000_000;
/** 멤버 아바타 색 개수 — DB members.color check(0~11)·화면 MEMBER_COLORS 와 같다 */
export const COLOR_COUNT = 12;

const optionalDate = z.union([z.iso.date(), z.literal("")]).transform((v) => v || null);

// 여행 이름·날짜 규칙 — 새 여행(홈)과 여행 정보 수정(설정)이 같이 쓴다
const tripBase = z.object({
  name: z.string().trim().min(1, "여행 이름을 적어 주세요.").max(30, "여행 이름은 30자까지 적을 수 있어요."),
  start: optionalDate,
  end: optionalDate,
});

function withDateRules<T extends z.ZodType<{ start: string | null; end: string | null }>>(schema: T) {
  return (
    schema
      .refine((t) => !t.start || !t.end || t.end >= t.start, { error: "종료일이 시작일보다 빨라요.", path: ["end"] })
      // 종료일만 있으면 하루짜리 여행, 시작일만 있으면 종료일 = 시작일
      .transform((t) => ({ ...t, start: t.start ?? t.end, end: t.end ?? t.start }))
  );
}

export const newTripSchema = withDateRules(tripBase);

export const tripInfoSchema = withDateRules(
  tripBase.extend({
    address: z
      .string()
      .trim()
      .max(100, "주소는 100자까지 적을 수 있어요.")
      .transform((v) => v || null),
  }),
);
export type TripInfoInput = z.input<typeof tripInfoSchema>;

export const memberNameSchema = z.string().trim().min(1, "이름을 적어 주세요.").max(10, "이름은 10자까지 적을 수 있어요.");

const memberColor = z.int().min(0).max(COLOR_COUNT - 1);

/**
 * 설정 화면 한 번에 저장 — 여행 정보(안 바뀌었으면 null) · 뺄 멤버 · 색 바꿀 멤버 · 새 멤버.
 * 배열 상한은 화면 밖 직접 호출로 거대한 입력을 넣는 것을 막는다. 인원 상한 자체는 DB 함수가 잠금 안에서 확인한다
 */
export const settingsSchema = z.object({
  trip: tripInfoSchema.nullable(),
  remove: z.array(z.uuid()).max(MAX_MEMBERS),
  colors: z.array(z.object({ id: z.uuid(), color: memberColor })).max(MAX_MEMBERS),
  add: z
    .array(z.object({ name: memberNameSchema, color: memberColor }))
    .max(MAX_MEMBERS, `최대 ${MAX_MEMBERS}명까지 추가할 수 있어요.`)
    .refine((a) => new Set(a.map((m) => m.name)).size === a.length, "같은 이름이 이미 있어요. 구별되게 적어 주세요."),
});
export type SettingsInput = z.input<typeof settingsSchema>;

export const expenseSchema = z.object({
  id: z.uuid().nullable(),
  amount: z
    .number({ error: "금액을 입력해 주세요." })
    .int("금액은 원 단위로 입력해 주세요.")
    .min(1, "금액을 입력해 주세요.")
    .max(MAX_AMOUNT, "금액이 너무 커요. 1억 원 이하로 입력해 주세요."),
  title: z.string().trim().min(1, "무엇에 쓴 돈인지 적어 주세요.").max(40, "내용은 40자까지 적을 수 있어요."),
  date: z.iso.date({ error: "날짜를 골라 주세요." }),
  category: z.enum(CATEGORIES),
  payerId: z.uuid({ error: "결제한 사람을 골라 주세요." }),
  // 상한은 화면 밖 직접 호출로 거대한 배열을 넣는 것을 막는다 (멤버는 최대 MAX_MEMBERS 명)
  split: z
    .array(z.uuid())
    .min(1, "같이 나눌 사람을 한 명 이상 골라 주세요.")
    .max(MAX_MEMBERS, "같이 나눌 사람이 너무 많아요."),
});
export type ExpenseInput = z.input<typeof expenseSchema>;

export const shoppingSchema = z.object({
  name: z.string().trim().min(1, "살 것을 적어 주세요.").max(30, "30자까지 적을 수 있어요."),
  group: z.enum(SHOP_GROUPS),
});

/** 첫 번째 검증 오류 문구 */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "입력을 확인해 주세요.";
}
