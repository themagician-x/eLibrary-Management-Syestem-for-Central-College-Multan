"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LOAN_DAYS, MAX_BOOKS_PER_STUDENT } from "@/lib/config";

export type ActionResult = { error?: string; position?: number };

function revalidate() {
  revalidatePath("/reservations");
  revalidatePath("/");
}

export async function reserveBook(bookId: string, studentId: string): Promise<ActionResult> {
  if (!bookId || !studentId) return { error: "Pick a book and a student." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reserve_book", {
    p_book_id: bookId,
    p_student_id: studentId,
  });
  if (error) return { error: error.message };
  revalidate();
  return { position: Number(data) || undefined };
}

export async function cancelReservation(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("reservations").update({ status: "cancelled" }).eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return {};
}

/** Issue the reserved book to the student (fulfils the reservation via issue_book). */
export async function issueReserved(bookId: string, studentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("issue_book", {
    p_book_id: bookId,
    p_student_id: studentId,
    p_days: LOAN_DAYS,
    p_max: MAX_BOOKS_PER_STUDENT,
  });
  if (error) return { error: error.message };
  revalidate();
  revalidatePath("/circulation");
  return {};
}
