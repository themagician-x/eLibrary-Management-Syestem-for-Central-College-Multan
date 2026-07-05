"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LOAN_DAYS, MAX_BOOKS_PER_STUDENT, MAX_RENEWS } from "@/lib/config";

export type ActionResult = { error?: string };

function revalidate() {
  revalidatePath("/circulation");
  revalidatePath("/");
  revalidatePath("/books");
}

export async function issueBook(bookId: string, studentId: string): Promise<ActionResult> {
  if (!bookId || !studentId) return { error: "Pick a book and a student." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("issue_book", {
    p_book_id: bookId,
    p_student_id: studentId,
    p_days: LOAN_DAYS,
    p_max: MAX_BOOKS_PER_STUDENT,
  });
  if (error) return { error: error.message };
  revalidate();
  return {};
}

export async function returnLoan(loanId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("return_loan", { p_loan_id: loanId });
  if (error) return { error: error.message };
  revalidate();
  return {};
}

export async function renewLoan(loanId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("renew_loan", {
    p_loan_id: loanId,
    p_days: LOAN_DAYS,
    p_max_renews: MAX_RENEWS,
  });
  if (error) return { error: error.message };
  revalidate();
  return {};
}
