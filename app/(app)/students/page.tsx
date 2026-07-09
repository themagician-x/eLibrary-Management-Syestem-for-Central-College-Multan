import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import SearchToolbar from "@/components/SearchToolbar";
import StudentsTable from "./students-table";
import { createClient } from "@/lib/supabase/server";
import type { Student } from "@/lib/types";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; dept?: string }>;
}) {
  const { q = "", status = "", dept = "" } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("students").select("*").order("created_at", { ascending: false });
  if (q.trim()) {
    const t = q.trim();
    query = query.or(`name.ilike.%${t}%,roll_no.ilike.%${t}%,email.ilike.%${t}%`);
  }
  if (status === "active" || status === "blocked") query = query.eq("status", status);
  if (dept) query = query.eq("class_dept", dept);

  const { data, error } = await query;

  // distinct departments read from the whole roll, not the filtered page, so
  // the options don't vanish as you narrow
  const { data: deptRows } = await supabase.from("students").select("class_dept");
  const depts = [...new Set((deptRows ?? []).map((r) => r.class_dept).filter(Boolean))].sort() as string[];

  const list = (data ?? []) as Student[];
  const filtering = Boolean(q || status || dept);

  return (
    <PageShell
      title="Students"
      subtitle="Registered student records."
      fill
      badge={`${list.length} ${list.length === 1 ? "student" : "students"}`}
      actions={
        <Link href="/students/new" className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-bold text-cream transition-colors hover:bg-navy-800">
          + Add student
        </Link>
      }
    >
      {error && (
        <div className="mb-6 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          Couldn&rsquo;t load students: {error.message}
        </div>
      )}

      {/* toolbar */}
      <SearchToolbar
        basePath="/students"
        q={q}
        placeholder="Search name, roll no or email…"
        filters={[
          {
            name: "status",
            value: status,
            ariaLabel: "Filter by status",
            width: "w-40",
            options: [
              { value: "", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "blocked", label: "Blocked" },
            ],
          },
          {
            name: "dept",
            value: dept,
            ariaLabel: "Filter by class or department",
            width: "w-56",
            options: [
              { value: "", label: "All classes / depts" },
              ...depts.map((d) => ({ value: d, label: d })),
            ],
          },
        ]}
      />

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-mist-deep bg-paper p-12 text-center">
          <p className="font-display text-lg font-semibold text-navy-900">{filtering ? "No students match." : "No students yet."}</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-mute">{filtering ? "Try a different search or clear the filters." : "Register your first student to start lending books to them."}</p>
          {!filtering && <Link href="/students/new" className="mt-5 inline-block rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-cream hover:bg-navy-800">+ Add your first student</Link>}
        </div>
      ) : (
        <StudentsTable students={list} />
      )}
    </PageShell>
  );
}
