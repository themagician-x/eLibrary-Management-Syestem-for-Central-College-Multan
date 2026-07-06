import { createClient } from "@/lib/supabase/server";
import { LOAN_DAYS, MAX_BOOKS_PER_STUDENT, MAX_RENEWS, FINE_PER_DAY } from "@/lib/config";

export type Settings = {
  loan_days: number;
  max_books: number;
  max_renews: number;
  fine_per_day: number;
};

/** Read the library rules, falling back to the config defaults. */
export async function getSettings(): Promise<Settings> {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
  return {
    loan_days: data?.loan_days ?? LOAN_DAYS,
    max_books: data?.max_books ?? MAX_BOOKS_PER_STUDENT,
    max_renews: data?.max_renews ?? MAX_RENEWS,
    fine_per_day: Number(data?.fine_per_day ?? FINE_PER_DAY),
  };
}
