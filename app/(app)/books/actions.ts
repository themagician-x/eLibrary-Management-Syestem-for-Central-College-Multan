"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateBarcode } from "@/lib/barcode";
import { normaliseIsbn, normaliseShelf } from "@/lib/isbn";
import type { BookShelf, WriteOffReason } from "@/lib/types";

/**
 * A title already in the catalogue that the details being entered would
 * duplicate. `certain` distinguishes an ISBN match — the same edition, beyond
 * argument — from a title-and-author match, which two editions can share
 * legitimately.
 */
export type DuplicateBook = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  total_copies: number;
  shelves: BookShelf[];
  certain: boolean;
};

export type BookFormState = {
  error?: string;
  ok?: boolean;
  title?: string;
  /** Set instead of inserting when the details match a catalogued title. */
  duplicate?: DuplicateBook;
};

function parse(formData: FormData) {
  const num = (v: FormDataEntryValue | null) => {
    const n = parseInt(String(v ?? ""), 10);
    return Number.isFinite(n) ? n : null;
  };
  const str = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim();
    return s === "" ? null : s;
  };
  // shelf and total_copies are deliberately absent: copies live on book_shelves
  // now, and books.total_copies is derived from them by the database
  return {
    title: String(formData.get("title") ?? "").trim(),
    author: str(formData.get("author")),
    isbn: str(formData.get("isbn")),
    publisher: str(formData.get("publisher")),
    published_year: num(formData.get("published_year")),
    category: str(formData.get("category")),
    language: str(formData.get("language")) ?? "English",
    description: str(formData.get("description")),
    cover_url: str(formData.get("cover_url")),
  };
}

/**
 * The shelf rows the form submits, as a JSON array in one hidden field.
 * Entries for the same shelf are folded together, since the trigger would
 * reject the second one as a primary-key collision rather than adding it.
 */
function parseShelves(formData: FormData): BookShelf[] {
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("shelves") ?? "[]"));
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];

  const folded = new Map<string, number>();
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const { shelf, copies } = entry as { shelf?: unknown; copies?: unknown };
    const n = Math.floor(Number(copies));
    if (!Number.isFinite(n) || n < 1) continue;
    const key = normaliseShelf(typeof shelf === "string" ? shelf : "");
    folded.set(key, (folded.get(key) ?? 0) + n);
  }
  return [...folded].map(([shelf, copies]) => ({ shelf, copies }));
}

const DUP_SELECT = "id,title,author,isbn,total_copies,book_shelves(shelf,copies)";

type DupRow = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  total_copies: number;
  book_shelves: BookShelf[] | null;
};

function toDuplicate(row: DupRow, certain: boolean): DuplicateBook {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    isbn: row.isbn,
    total_copies: row.total_copies,
    shelves: row.book_shelves ?? [],
    certain,
  };
}

/**
 * Is this title already catalogued? Two rules, deliberately unequal.
 *
 * An ISBN match is conclusive: an ISBN identifies an edition, so the same one
 * twice is the same book — and if the titles differ, that is a typo worth
 * showing the librarian rather than a second record worth creating.
 *
 * A title-and-author match, with no ISBN to check, is only a suspicion. Two
 * editions of one work share both quite legitimately, so it warns and lets the
 * librarian decide.
 *
 * Exported so the form can ask while the librarian is still typing.
 */
export async function findDuplicate(
  isbn: string | null,
  title: string,
  author: string | null,
  excludeId?: string
): Promise<DuplicateBook | null> {
  const supabase = await createClient();
  const key = normaliseIsbn(isbn);

  if (key) {
    let q = supabase.from("books").select(DUP_SELECT).eq("isbn_key", key).limit(1);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q;
    if (data?.length) return toDuplicate(data[0] as DupRow, true);
    // an ISBN was given and matched nothing — that settles it, no soft check
    return null;
  }

  const t = title.trim();
  if (!t) return null;
  let q = supabase.from("books").select(DUP_SELECT).ilike("title", t).limit(5);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  if (!data?.length) return null;

  const a = (author ?? "").trim().toLowerCase();
  const match = (data as DupRow[]).find(
    (r) => (r.author ?? "").trim().toLowerCase() === a
  );
  return match ? toDuplicate(match, false) : null;
}

export async function createBook(
  _prev: BookFormState,
  formData: FormData
): Promise<BookFormState> {
  const data = parse(formData);
  if (!data.title) return { error: "Title is required." };

  const shelves = parseShelves(formData);

  // "yes, I know it's there, add these copies anyway" — set by the dialog that
  // the duplicate below produces, so a second pass is not stopped by it again
  const confirmed = String(formData.get("confirm_duplicate") ?? "") === "1";

  if (!confirmed) {
    const dup = await findDuplicate(data.isbn, data.title, data.author);
    if (dup) return { duplicate: dup };
  }

  const supabase = await createClient();

  // available_copies and total_copies are both derived by the database — the
  // first from copies on loan, the second from the shelf rows written below.
  // Barcodes are random, so retry the long-shot collision against the unique
  // index rather than showing the admin a constraint-violation string.
  let error = null;
  let inserted: { id: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await supabase
      .from("books")
      .insert({ ...data, barcode: generateBarcode() })
      .select("id")
      .single();
    error = res.error;
    inserted = res.data;
    if (!error) break;
    // 23505 on isbn_key means another route catalogued it between the check
    // above and this insert; the barcode is the only other unique column
    if (error.code !== "23505") break;
    if (error.message.includes("isbn_key")) {
      const dup = await findDuplicate(data.isbn, data.title, data.author);
      if (dup) return { duplicate: dup };
      break;
    }
  }

  if (error || !inserted) {
    return {
      error:
        error?.code === "23505"
          ? "Couldn't allocate a unique barcode. Please try again."
          : (error?.message ?? "Couldn't save the book."),
    };
  }

  for (const s of shelves) {
    const { error: shelfError } = await supabase.rpc("place_copies", {
      p_book_id: inserted.id,
      p_shelf: s.shelf,
      p_copies: s.copies,
    });
    if (shelfError) return { error: shelfError.message };
  }

  revalidatePath("/books");
  revalidatePath("/");
  return { ok: true, title: data.title };
}

/**
 * Put copies of an already-catalogued title on a shelf. This is what the
 * duplicate dialog confirms into: no second book row, just more copies in a
 * named place. The book's total follows from the shelf rows.
 */
export async function addCopiesToShelf(
  bookId: string,
  shelf: string,
  copies: number
): Promise<{ error?: string; total?: number }> {
  if (!Number.isFinite(copies) || copies < 1) {
    return { error: "Enter at least one copy." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_copies", {
    p_book_id: bookId,
    p_shelf: normaliseShelf(shelf),
    p_copies: Math.floor(copies),
  });
  if (error) return { error: error.message };

  revalidatePath("/books");
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/");
  return { total: typeof data === "number" ? data : undefined };
}

/** Move copies of a title from one shelf to another, leaving the total alone. */
export async function moveCopies(
  bookId: string,
  from: string,
  to: string,
  copies: number
): Promise<{ error?: string }> {
  if (!Number.isFinite(copies) || copies < 1) {
    return { error: "Enter at least one copy." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("move_copies", {
    p_book_id: bookId,
    p_from: normaliseShelf(from),
    p_to: normaliseShelf(to),
    p_copies: Math.floor(copies),
  });
  if (error) return { error: error.message };

  revalidatePath("/books");
  revalidatePath(`/books/${bookId}`);
  return {};
}

export async function updateBook(
  id: string,
  _prev: BookFormState,
  formData: FormData
): Promise<BookFormState> {
  const data = parse(formData);
  if (!data.title) return { error: "Title is required." };

  // editing the ISBN onto one already catalogued would merge two titles by
  // accident, so it is refused for the same reason a new one is
  const dup = await findDuplicate(data.isbn, data.title, data.author, id);
  if (dup?.certain) return { duplicate: dup };

  const supabase = await createClient();

  const { error } = await supabase.from("books").update(data).eq("id", id);
  if (error) {
    return {
      error:
        error.code === "23505" && error.message.includes("isbn_key")
          ? "Another book already has that ISBN."
          : error.message,
    };
  }

  // Reconcile the shelves to exactly what the form submitted. Copies out with
  // students are counted against the title, not a shelf, so this is safe to do
  // wholesale: available_copies is re-derived from open loans either way.
  const shelves = parseShelves(formData);
  const { data: current } = await supabase
    .from("book_shelves")
    .select("shelf,copies")
    .eq("book_id", id);

  // A form that submitted nothing usable is a form that failed to load, not a
  // librarian asking for every copy to be removed — the editor always sends at
  // least one row. Reconciling against it would silently empty the shelves, so
  // leave them alone instead.
  if (shelves.length === 0 && (current?.length ?? 0) > 0) {
    revalidatePath("/books");
    revalidatePath(`/books/${id}`);
    return { ok: true, title: data.title };
  }

  const wanted = new Map(shelves.map((s) => [s.shelf, s.copies]));
  const held = new Map((current ?? []).map((s) => [s.shelf, s.copies]));

  for (const shelf of held.keys()) {
    if (!wanted.has(shelf)) {
      const { error: e } = await supabase
        .from("book_shelves")
        .delete()
        .eq("book_id", id)
        .eq("shelf", shelf);
      if (e) return { error: e.message };
    }
  }
  for (const [shelf, copies] of wanted) {
    if (held.get(shelf) === copies) continue;
    const { error: e } = await supabase
      .from("book_shelves")
      .upsert({ book_id: id, shelf, copies }, { onConflict: "book_id,shelf" });
    if (e) return { error: e.message };
  }

  revalidatePath("/books");
  revalidatePath(`/books/${id}`);
  revalidatePath("/");
  return { ok: true, title: data.title };
}

/**
 * Retire one shelf copy that is lost or damaged beyond use. For a copy that is
 * currently with a student, use the Lost / Damaged action on Circulation
 * instead — that one also closes the loan and charges the borrower.
 */
export async function writeOffCopy(
  bookId: string,
  reason: WriteOffReason,
  note: string,
  shelf?: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("write_off_copy", {
    p_book_id: bookId,
    p_loan_id: null,
    p_reason: reason,
    p_note: note.trim() || null,
    p_charge: 0,
    // omitted means "take it from the shelf holding the most", which is the
    // right default when the librarian did not record where it came from
    p_shelf: shelf ? normaliseShelf(shelf) : null,
  });
  if (error) return { error: error.message };

  revalidatePath("/books");
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/reports");
  revalidatePath("/");
  return {};
}

export async function deleteBook(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("books").delete().eq("id", id);

  // the database refuses while copies are still out with students
  if (error) return { error: error.message };

  revalidatePath("/books");
  revalidatePath("/");
  return {};
}
