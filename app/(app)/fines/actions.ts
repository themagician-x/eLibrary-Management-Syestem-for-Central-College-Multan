"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string };

function revalidate(studentId?: string) {
  revalidatePath("/fines");
  revalidatePath("/");
  if (studentId) revalidatePath(`/students/${studentId}`);
}

export async function addCharge(
  studentId: string,
  amount: number,
  reason: "lost" | "damaged",
  note: string
): Promise<ActionResult> {
  if (!studentId) return { error: "Pick a student." };
  if (!amount || amount <= 0) return { error: "Enter a valid amount." };

  const supabase = await createClient();
  const { error } = await supabase.from("fines").insert({
    student_id: studentId,
    amount,
    reason,
    note: note || null,
  });
  if (error) return { error: error.message };
  revalidate(studentId);
  return {};
}

export async function setFineStatus(
  id: string,
  status: "paid" | "waived" | "unpaid"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fines")
    .update({ status })
    .eq("id", id)
    .select("student_id")
    .single();
  if (error) return { error: error.message };
  revalidate(data?.student_id);
  return {};
}
