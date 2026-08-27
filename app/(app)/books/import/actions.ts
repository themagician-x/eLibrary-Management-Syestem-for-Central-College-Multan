"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateBarcode } from "@/lib/barcode";
import { normaliseIsbn, normaliseShelf } from "@/lib/isbn";

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
  // doesn't silently duplicate every title. Matching is on the normalised key
  // the database indexes, so a hyphenated ISBN in the file still recognises an
  // unhyphenated one already catalogued.
  const isbns = [
    ...new Set(withTitle.map((r) => normaliseIsbn(r.isbn)).filter(Boolean) as string[]),
  ];
  const existing = new Set<string>();
  for (let i = 0; i < isbns.length; i += BATCH) {
    const { data } = await supabase
      .from("books")
      .select("isbn_key")
      .in("isbn_key", isbns.slice(i, i + BATCH));
    for (const row of data ?? []) if (row.isbn_key) existing.add(row.isbn_key);
  }

  const seen = new Set<string>();
  let duplicates = 0;

  const clean = withTitle
    .filter((r) => {
      const key = normaliseIsbn(r.isbn);
      if (!key) return true; // nothing to match on — let it through
      if (existing.has(key) || seen.has(key)) {
        duplicates++;
        return false;
      }
      seen.add(key);
      return true;
    })
    .map((r) => ({
      // shelf and copies are placed separately, after the row has an id
      book: {
        title: r.title.trim(),
        author: r.author?.trim() || null,
        isbn: r.isbn?.trim() || null,
        publisher: r.publisher?.trim() || null,
        published_year: r.published_year ?? null,
        category: r.category?.trim() || null,
        language: r.language?.trim() || "English",
        barcode: generateBarcode(),
      },
      shelf: normaliseShelf(r.shelf),
      copies: Math.max(0, Number(r.total_copies) || 1),
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
    const { data: rowsIn, error } = await supabase
      .from("books")
      .insert(batch.map((b) => b.book))
      .select("id");
    if (error || !rowsIn) {
      const message = error?.message ?? "Import failed.";
      return {
        inserted,
        duplicates,
        invalid,
        error:
          inserted > 0
            ? `Imported ${inserted} book(s), then stopped: ${message}`
            : message,
      };
    }

    // place each title's copies; insert returns rows in the order supplied
    const placements = rowsIn
      .map((row, j) => ({
        book_id: row.id,
        shelf: batch[j].shelf,
        copies: batch[j].copies,
      }))
      .filter((p) => p.copies > 0);

    if (placements.length) {
      const { error: shelfError } = await supabase
        .from("book_shelves")
        .insert(placements);
      if (shelfError) {
        return {
          inserted,
          duplicates,
          invalid,
          error: `Imported ${inserted + rowsIn.length} book(s), but placing copies on shelves failed: ${shelfError.message}`,
        };
      }
    }

    inserted += batch.length;
  }

  revalidatePath("/books");
  revalidatePath("/");
  return { inserted, duplicates, invalid };
}
