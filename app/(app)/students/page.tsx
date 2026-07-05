import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import Avatar from "@/components/Avatar";
import ConfirmDelete from "@/components/ConfirmDelete";
import { createClient } from "@/lib/supabase/server";
import type { Student } from "@/lib/types";
import { deleteStudent } from "./actions";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = "", status = "" } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("students").select("*").order("created_at", { ascending: false });
  if (q.trim()) {
    const t = q.trim();
    query = query.or(`name.ilike.%${t}%,roll_no.ilike.%${t}%,email.ilike.%${t}%`);
  }
  if (status === "active" || status === "blocked") query = query.eq("status", status);

  const { data, error } = await query;
  const list = (data ?? []) as Student[];
  const filtering = Boolean(q || status);

  return (
    <PageShell
      title="Students"
      subtitle="Registered student records."
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
      <form className="mb-6 flex flex-wrap items-center gap-3" action="/students">
        <div className="relative min-w-0 flex-1">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input name="q" defaultValue={q} placeholder="Search name, roll no or email…" className="w-full rounded-xl border border-mist-deep bg-paper py-2.5 pl-10 pr-4 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25" />
        </div>
        <select name="status" defaultValue={status} className="rounded-xl border border-mist-deep bg-paper px-3 py-2.5 text-sm outline-none focus:border-gold-500">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
        <button type="submit" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-cream hover:bg-navy-800">Search</button>
        {filtering && <Link href="/students" className="text-sm font-semibold text-ink-mute hover:text-navy-900">Clear</Link>}
      </form>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-mist-deep bg-paper p-12 text-center">
          <p className="font-display text-lg font-semibold text-navy-900">{filtering ? "No students match." : "No students yet."}</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-mute">{filtering ? "Try a different search or clear the filters." : "Register your first student to start lending books to them."}</p>
          {!filtering && <Link href="/students/new" className="mt-5 inline-block rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-cream hover:bg-navy-800">+ Add your first student</Link>}
        </div>
      ) : (
        <>
          <p className="mb-4 font-mono text-xs uppercase tracking-wider text-ink-mute">{list.length} {list.length === 1 ? "student" : "students"}</p>
          <div className="overflow-hidden rounded-2xl border border-mist-deep">
            <div className="hidden grid-cols-[1fr_140px_140px_100px_80px] gap-4 border-b border-mist-deep bg-mist px-5 py-3 font-mono text-[0.6rem] uppercase tracking-wider text-ink-mute sm:grid">
              <span>Student</span><span>Roll no</span><span>Class / Dept</span><span>Status</span><span className="text-right">Actions</span>
            </div>
            {list.map((s) => (
              <div key={s.id} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-mist bg-paper px-5 py-3 last:border-0 sm:grid-cols-[1fr_140px_140px_100px_80px]">
                <Link href={`/students/${s.id}`} className="flex min-w-0 items-center gap-3">
                  <Avatar name={s.name} src={s.photo_url} size={40} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-navy-900">{s.name}</span>
                    <span className="block truncate text-xs text-ink-mute">{s.email ?? "No email"}</span>
                  </span>
                </Link>
                <span className="hidden font-mono text-sm text-ink-soft sm:block">{s.roll_no ?? "—"}</span>
                <span className="hidden truncate text-sm text-ink-soft sm:block">{s.class_dept ?? "—"}</span>
                <span className="hidden sm:block">
                  <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${s.status === "active" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>{s.status}</span>
                </span>
                <span className="flex items-center justify-end gap-1">
                  <Link href={`/students/${s.id}/edit`} aria-label={`Edit ${s.name}`} title="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-mute transition-colors hover:bg-mist hover:text-navy-900">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M13.5 6.5l3 3" /></svg>
                  </Link>
                  <ConfirmDelete onDelete={deleteStudent.bind(null, s.id)} name={s.name} />
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
