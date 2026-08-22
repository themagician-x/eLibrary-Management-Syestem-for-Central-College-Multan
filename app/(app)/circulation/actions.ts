"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import type { WriteOffReason } from "@/lib/types";

export type ActionResult = { error?: string; fine?: number };

function revalidate() {
  revalidatePath("/circulation");
  revalidatePath("/");
  revalidatePath("/books");
  revalidatePath("/fines");
}

export async function issueBook(bookId: string, studentId: string): Promise<ActionResult> {
  if (!bookId || !studentId) return { error: "Pick a book and a student." };
  const supabase = await createClient();
  const { loan_days, max_books } = await getSettings();
  const { error } = await supabase.rpc("issue_book", {
    p_book_id: bookId,
    p_student_id: studentId,
    p_days: loan_days,
    p_max: max_books,
  });
  if (error) return { error: error.message };
  revalidate();
  return {};
}

export async function returnLoan(loanId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { fine_per_day } = await getSettings();
  const { data, error } = await supabase.rpc("return_loan", {
    p_loan_id: loanId,
    p_fine_per_day: fine_per_day,
  });
  if (error) return { error: error.message };
  revalidate();
  return { fine: Number(data) || 0 };
}

/**
 * Retire the copy this loan is for: the book is lost or damaged beyond use, so
 * it never returns to the shelf. Closes the loan, drops one copy from the
 * inventory, and raises the replacement charge as a fine on the borrower.
 */
export async function writeOffLoan(
  bookId: string,
  loanId: string,
  reason: WriteOffReason,
  note: string,
  charge: number
): Promise<ActionResult> {
  if (!bookId || !loanId) return { error: "Missing loan." };
  if (!Number.isFinite(charge) || charge < 0) return { error: "Enter a valid charge." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("write_off_copy", {
    p_book_id: bookId,
    p_loan_id: loanId,
    p_reason: reason,
    p_note: note.trim() || null,
    p_charge: charge,
  });
  if (error) return { error: error.message };
  revalidate();
  return {};
}

export async function renewLoan(loanId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { loan_days, max_renews } = await getSettings();
  const { error } = await supabase.rpc("renew_loan", {
    p_loan_id: loanId,
    p_days: loan_days,
    p_max_renews: max_renews,
  });
  if (error) return { error: error.message };
  revalidate();
  return {};
}
