import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import StudentForm from "../student-form";
import { createStudent } from "../actions";

export const metadata: Metadata = { title: "Add student" };

export default function NewStudentPage() {
  return (
    <PageShell
      title="Register a student"
      subtitle="Add a new student record."
      actions={
        <Link href="/students" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist">
          ← Back to students
        </Link>
      }
    >
      <StudentForm action={createStudent} submitLabel="Add student" />
    </PageShell>
  );
}
