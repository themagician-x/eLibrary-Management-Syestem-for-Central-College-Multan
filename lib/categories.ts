import { createClient } from "@/lib/supabase/server";

/**
 * Distinct categories already used in the catalogue. A category the admin types
 * into the book form is stored on the book itself, so reading them back is what
 * makes a custom category stick around as a suggestion for the next book.
 */
export async function getUsedCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("books").select("category");
  return [
    ...new Set(
      (data ?? [])
        .map((r) => (r.category ?? "").trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));
}
