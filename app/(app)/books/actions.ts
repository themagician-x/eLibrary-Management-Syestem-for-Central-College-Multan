"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateBarcode } from "@/lib/barcode";
import type { WriteOffReason } from "@/lib/types";

export type BookFormState = { error?: string; ok?: boolean; title?: string };

function parse(formData: FormData) {
  const num = (v: FormDataEntryValue | null) => {
    const n = parseInt(String(v ?? ""), 10);
    return Number.isFinite(n) ? n : null;
  };
  const str = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim();
    return s === "" ? null : s;
  };
  return {
    title: String(formData.get("title") ?? "").trim(),
    author: str(formData.get("author")),
    isbn: str(formData.get("isbn")),
    publisher: str(formData.get("publisher")),
    published_year: num(formData.get("published_year")),
    category: str(formData.get("category")),
    language: str(formData.get("language")) ?? "English",
    description: str(formData.get("description")),
    shelf: str(formData.get("shelf")),
    cover_url: str(formData.get("cover_url")),
    total_copies: Math.max(0, num(formData.get("total_copies")) ?? 1),
  };
}

export async function createBook(
  _prev: BookFormState,
  formData: FormData
): Promise<BookFormState> {
  const data = parse(formData);
  if (!data.title) return { error: "Title is required." };

  const supabase = await createClient();

  // available_copies is derived by the database (total minus copies on loan).
  // Barcodes are random, so retry the long-shot collision against the unique
  // index rather than showing the admin a constraint-violation string.
  let error = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    ({ error } = await supabase.from("books").insert({
      ...data,
      barcode: generateBarcode(),
    }));
    if (!error) break;
    // 23505 = unique violation; only the barcode column can collide here
    if (error.code !== "23505") break;
  }

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Couldn't allocate a unique barcode. Please try again."
          : error.message,
    };
  }

  revalidatePath("/books");
  revalidatePath("/");
  return { ok: true, title: data.title };
}

export async function updateBook(
  id: string,
  _prev: BookFormState,
  formData: FormData
): Promise<BookFormState> {
  const data = parse(formData);
  if (!data.title) return { error: "Title is required." };

  const supabase = await createClient();

  // available_copies is derived by the database, so changing total_copies here
  // re-derives it from the loans actually outstanding
  const { error } = await supabase.from("books").update(data).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/books");
  revalidatePath(`/books/${id}`);
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
  note: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("write_off_copy", {
    p_book_id: bookId,
    p_loan_id: null,
    p_reason: reason,
    p_note: note.trim() || null,
    p_charge: 0,
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
