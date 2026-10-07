// supabase/migrations 기준으로 손으로 맞춘 타입.
// Supabase 프로젝트가 생기면 `npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts` 로 재생성한다.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type TripRow = {
  id: string;
  slug: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  taker_member_id: string | null;
  forecast: Json | null;
  created_at: string;
  updated_at: string;
};

export type MemberRow = {
  id: string;
  trip_id: string;
  name: string;
  color: number;
  sort_order: number;
  created_at: string;
};

export type ExpenseRow = {
  id: string;
  trip_id: string;
  date: string;
  title: string;
  category: string;
  amount: number;
  payer_id: string;
  created_at: string;
  updated_at: string;
};

export type ExpenseSplitRow = {
  expense_id: string;
  member_id: string;
  trip_id: string;
};

export type ShoppingItemRow = {
  id: string;
  trip_id: string;
  name: string;
  grp: string;
  done: boolean;
  created_at: string;
};

export type MusicCacheRow = {
  key: string;
  videos: Json;
  fetched_at: string;
};

export type TripSummaryRow = {
  slug: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  updated_at: string;
  member_count: number;
  expense_count: number;
  total: number;
};

export type Database = {
  public: {
    Tables: {
      trips: Table<TripRow, "slug" | "name">;
      members: Table<MemberRow, "trip_id" | "name" | "color" | "sort_order">;
      expenses: Table<ExpenseRow, "trip_id" | "date" | "title" | "category" | "amount" | "payer_id">;
      expense_splits: Table<ExpenseSplitRow, "expense_id" | "member_id" | "trip_id">;
      shopping_items: Table<ShoppingItemRow, "trip_id" | "name">;
      music_cache: Table<MusicCacheRow, "key" | "videos">;
    };
    Views: {
      trip_summaries: { Row: TripSummaryRow; Relationships: [] };
    };
    Functions: {
      save_expense: {
        Args: {
          p_trip_id: string;
          p_expense_id: string | null;
          p_date: string;
          p_title: string;
          p_category: string;
          p_amount: number;
          p_payer_id: string;
          p_split: string[];
        };
        Returns: string;
      };
      add_member: {
        Args: { p_trip_id: string; p_name: string; p_max: number };
        Returns: string;
      };
      save_trip_settings: {
        Args: {
          p_trip_id: string;
          p_trip: { name: string; start: string | null; end: string | null; address: string | null } | null;
          p_remove: string[];
          p_colors: { id: string; color: number }[];
          p_add: { name: string; color: number }[];
          p_max: number;
        };
        Returns: undefined;
      };
      add_shopping_item: {
        Args: { p_trip_id: string; p_name: string; p_grp: string; p_max: number };
        Returns: string;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
