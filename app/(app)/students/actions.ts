"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type StudentFormState = { error?: string; ok?: boolean };

function parse(formData: FormData) {
  const str = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim();
    return s === "" ? null : s;
  };
  const status = String(formData.get("status") ?? "active");
  return {
    name: String(formData.get("name") ?? "").trim(),
    roll_no: str(formData.get("roll_no")),
    class_dept: str(formData.get("class_dept")),
    email: str(formData.get("email")),
    phone: str(formData.get("phone")),
    photo_url: str(formData.get("photo_url")),
    status: status === "blocked" ? "blocked" : "active",
  };
}

export async function createStudent(
  _prev: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const data = parse(formData);
  if (!data.name) return { error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("students").insert(data);
  if (error) {
    if (error.code === "23505") return { error: "That roll number is already registered." };
    return { error: error.message };
  }

  revalidatePath("/students");
  revalidatePath("/");
  return { ok: true };
}

export async function updateStudent(
  id: string,
  _prev: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const data = parse(formData);
  if (!data.name) return { error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("students").update(data).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "That roll number is already registered." };
    return { error: error.message };
  }

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  return { ok: true };
}

export async function deleteStudent(id: string) {
  const supabase = await createClient();
  await supabase.from("students").delete().eq("id", id);
  revalidatePath("/students");
  revalidatePath("/");
}
