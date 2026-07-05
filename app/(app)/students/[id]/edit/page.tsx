import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import type { Student } from "@/lib/types";
import StudentForm from "../../student-form";
import { updateStudent } from "../../actions";

export const metadata: Metadata = { title: "Edit student" };

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: student } = await supabase.from("students").select("*").eq("id", id).single();
  if (!student) notFound();

  const action = updateStudent.bind(null, id);

  return (
    <PageShell
      title="Edit student"
      subtitle={(student as Student).name}
      actions={
        <Link href="/students" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist">
          ← Back to students
        </Link>
      }
    >
      <StudentForm action={action} student={student as Student} submitLabel="Save changes" />
    </PageShell>
  );
}
