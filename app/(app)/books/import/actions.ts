"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateBarcode } from "@/lib/barcode";

export type ImportRow = {
  title: string;
  author?: string;
  isbn?: string;
  publisher?: string;
  published_year?: number | null;
  category?: string;
  language?: string;
  shelf?: string;
  total_copies?: number;
};

export async function importBooks(
  rows: ImportRow[]
): Promise<{ inserted: number; error?: string }> {
  const clean = rows
    .filter((r) => r.title && r.title.trim())
    .map((r) => {
      const copies = Math.max(0, Number(r.total_copies) || 1);
      return {
        title: r.title.trim(),
        author: r.author?.trim() || null,
        isbn: r.isbn?.trim() || null,
        publisher: r.publisher?.trim() || null,
        published_year: r.published_year ?? null,
        category: r.category?.trim() || null,
        language: r.language?.trim() || "English",
        shelf: r.shelf?.trim() || null,
        total_copies: copies,
        available_copies: copies,
        barcode: generateBarcode(),
      };
    });

  if (clean.length === 0) return { inserted: 0, error: "No valid rows (each needs a title)." };

  const supabase = await createClient();
  const { error } = await supabase.from("books").insert(clean);
  if (error) return { inserted: 0, error: error.message };

  revalidatePath("/books");
  revalidatePath("/");
  return { inserted: clean.length };
}
