import { notFound } from "next/navigation";
import Modal from "@/components/Modal";
import StudentForm from "@/app/(app)/students/student-form";
import { updateStudent } from "@/app/(app)/students/actions";
import type { Student } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export default async function InterceptedEditStudent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: student } = await supabase.from("students").select("*").eq("id", id).single();
  if (!student) notFound();

  return (
    <Modal title="Edit student" subtitle={(student as Student).name}>
      <StudentForm action={updateStudent.bind(null, id)} student={student as Student} submitLabel="Save changes" />
    </Modal>
  );
}
