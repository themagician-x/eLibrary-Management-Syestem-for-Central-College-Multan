"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; ok?: boolean };

export async function saveSettings(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const num = (k: string, min: number, max: number) => {
    const n = Number(formData.get(k));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({
      loan_days: num("loan_days", 1, 365),
      max_books: num("max_books", 1, 50),
      max_renews: num("max_renews", 0, 20),
      fine_per_day: num("fine_per_day", 0, 100000),
    })
    .eq("id", 1);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/circulation");
  revalidatePath("/fines");
  return { ok: true };
}
