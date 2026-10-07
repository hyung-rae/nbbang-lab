/** 지출 분류 (고정 7개). 순서가 트리맵 색 `--cat-0`~`--cat-6` 과 1:1 이다 */
export const CATEGORIES = ["식비", "카페·간식", "숙소", "교통", "관광·체험", "쇼핑", "기타"] as const;
export type Category = (typeof CATEGORIES)[number];

/** 장보기 분류. 지출 분류와 이름만 같고 목록이 다르다 */
export const SHOP_GROUPS = ["고기", "채소·쌈", "식사·아침", "술·음료", "간식·안주", "바비큐·생활용품", "기타"] as const;
export type ShopGroup = (typeof SHOP_GROUPS)[number];

export function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}

/** 모르는 분류는 기타(6) 색 */
export function categoryIndex(c: string): number {
  const i = (CATEGORIES as readonly string[]).indexOf(c);
  return i === -1 ? CATEGORIES.length - 1 : i;
}

/** 모르는 값은 기타로 읽는다 (명세 `shopping[].group`) */
export function toShopGroup(v: string): ShopGroup {
  return (SHOP_GROUPS as readonly string[]).includes(v) ? (v as ShopGroup) : "기타";
}
