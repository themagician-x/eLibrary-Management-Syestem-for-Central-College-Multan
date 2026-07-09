"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateBarcode } from "@/lib/barcode";

export type BookFormState = { error?: string; ok?: boolean };

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
  const { error } = await supabase.from("books").insert({
    ...data,
    available_copies: data.total_copies,
    barcode: generateBarcode(),
  });

  if (error) return { error: error.message };

  revalidatePath("/books");
  revalidatePath("/");
  return { ok: true };
}

export async function updateBook(
  id: string,
  _prev: BookFormState,
  formData: FormData
): Promise<BookFormState> {
  const data = parse(formData);
  if (!data.title) return { error: "Title is required." };

  const supabase = await createClient();

  // keep available_copies consistent when total changes
  const { data: current } = await supabase
    .from("books")
    .select("total_copies, available_copies")
    .eq("id", id)
    .single();

  let available = current?.available_copies ?? data.total_copies;
  if (current) {
    const onLoan = current.total_copies - current.available_copies;
    available = Math.max(0, data.total_copies - onLoan);
  }

  const { error } = await supabase
    .from("books")
    .update({ ...data, available_copies: available })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/books");
  revalidatePath(`/books/${id}`);
  return { ok: true };
}

export async function deleteBook(id: string) {
  const supabase = await createClient();
  await supabase.from("books").delete().eq("id", id);
  revalidatePath("/books");
  revalidatePath("/");
}
