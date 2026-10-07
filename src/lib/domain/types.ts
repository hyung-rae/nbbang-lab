import type { Category, ShopGroup } from "./categories";

export type MemberId = string;

export interface Member {
  id: MemberId;
  name: string;
  /** 아바타 색 번호 0~5 (`--m0`~`--m5`) */
  color: number;
}

export interface Expense {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  category: Category;
  /** 원 단위 정수 */
  amount: number;
  payerId: MemberId;
  /** 같이 나눌 멤버 id. 순서는 의미 없음 — 나머지 원 배분은 멤버 순서를 따른다 */
  split: MemberId[];
}

export interface Trip {
  name: string;
  /** YYYY-MM-DD */
  start: string | null;
  /** YYYY-MM-DD */
  end: string | null;
  address: string | null;
}

export interface ShoppingItem {
  id: string;
  name: string;
  group: ShopGroup;
  done: boolean;
}

export interface ForecastDay {
  /** YYYY-MM-DD */
  date: string;
  /** WMO weather code */
  code: number;
  max: number;
  min: number;
  /** 강수확률 % */
  pop: number;
}

export interface Forecast {
  /** 예보를 받을 때의 숙소 주소. 현재 주소와 다르면 숨긴다 */
  addr: string;
  /** 받은 시각 (ISO) */
  at: string;
  src: string;
  days: ForecastDay[];
}

/** 여행 화면 하나를 그리는 데 필요한 전부 */
export interface TripData {
  id: string;
  slug: string;
  trip: Trip;
  /** sort_order 순 — N빵 나머지 배분 순서 */
  members: Member[];
  expenses: Expense[];
  shopping: ShoppingItem[];
  takerId: MemberId | null;
  forecast: Forecast | null;
  /** 마지막 저장 시각 (ISO) */
  updatedAt: string;
}
