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

export type ImportResult = {
  inserted: number;
  /** Rows skipped because that ISBN is already catalogued. */
  duplicates: number;
  /** Rows skipped for having no title. */
  invalid: number;
  error?: string;
};

/** Rows per insert. Keeps each request well inside the serverless body limit. */
const BATCH = 200;

// Most rows one upload may carry. Not exported: a "use server" module may only
// export async functions, and a stray const silently voids every export in it.
const MAX_ROWS = 5000;

export async function importBooks(rows: ImportRow[]): Promise<ImportResult> {
  const empty = { inserted: 0, duplicates: 0, invalid: 0 };

  if (rows.length > MAX_ROWS) {
    return {
      ...empty,
      error: `That file has ${rows.length.toLocaleString()} rows — the limit is ${MAX_ROWS.toLocaleString()} per import. Split it and upload again.`,
    };
  }

  const withTitle = rows.filter((r) => r.title && r.title.trim());
  const invalid = rows.length - withTitle.length;

  const supabase = await createClient();

  // skip ISBNs already in the catalogue, so importing the same file twice
  // doesn't silently duplicate every title
  const isbns = [...new Set(withTitle.map((r) => r.isbn?.trim()).filter(Boolean) as string[])];
  const existing = new Set<string>();
  for (let i = 0; i < isbns.length; i += BATCH) {
    const { data } = await supabase
      .from("books")
      .select("isbn")
      .in("isbn", isbns.slice(i, i + BATCH));
    for (const row of data ?? []) if (row.isbn) existing.add(row.isbn);
  }

  const seen = new Set<string>();
  let duplicates = 0;

  const clean = withTitle
    .filter((r) => {
      const isbn = r.isbn?.trim();
      if (!isbn) return true; // nothing to match on — let it through
      if (existing.has(isbn) || seen.has(isbn)) {
        duplicates++;
        return false;
      }
      seen.add(isbn);
      return true;
    })
    .map((r) => ({
      title: r.title.trim(),
      author: r.author?.trim() || null,
      isbn: r.isbn?.trim() || null,
      publisher: r.publisher?.trim() || null,
      published_year: r.published_year ?? null,
      category: r.category?.trim() || null,
      language: r.language?.trim() || "English",
      shelf: r.shelf?.trim() || null,
      total_copies: Math.max(0, Number(r.total_copies) || 1),
      barcode: generateBarcode(),
    }));

  if (clean.length === 0) {
    return {
      ...empty,
      duplicates,
      invalid,
      error: duplicates
        ? `Nothing imported — all ${duplicates} row(s) are already in the catalogue.`
        : "No valid rows (each needs a title).",
    };
  }

  let inserted = 0;
  for (let i = 0; i < clean.length; i += BATCH) {
    const batch = clean.slice(i, i + BATCH);
    const { error } = await supabase.from("books").insert(batch);
    if (error) {
      return {
        inserted,
        duplicates,
        invalid,
        error:
          inserted > 0
            ? `Imported ${inserted} book(s), then stopped: ${error.message}`
            : error.message,
      };
    }
    inserted += batch.length;
  }

  revalidatePath("/books");
  revalidatePath("/");
  return { inserted, duplicates, invalid };
}
