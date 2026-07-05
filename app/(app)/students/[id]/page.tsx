import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import Avatar from "@/components/Avatar";
import ConfirmDelete from "@/components/ConfirmDelete";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/config";
import type { Student } from "@/lib/types";
import { deleteStudent } from "../actions";

export const metadata: Metadata = { title: "Student" };

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("students").select("*").eq("id", id).single();
  if (!data) notFound();
  const s = data as Student;

  const [{ count: totalBorrowed }, { data: currentLoans }, { data: unpaidFines }] = await Promise.all([
    supabase.from("loans").select("*", { count: "exact", head: true }).eq("student_id", id),
    supabase
      .from("loans")
      .select("id,due_at,book:books(id,title,author)")
      .eq("student_id", id)
      .is("returned_at", null)
      .order("due_at", { ascending: true }),
    supabase.from("fines").select("amount").eq("student_id", id).eq("status", "unpaid"),
  ]);
  const outstandingFines = (unpaidFines ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const loans = (currentLoans ?? []) as unknown as {
    id: string;
    due_at: string;
    book: { id: string; title: string; author: string | null } | null;
  }[];
  const overdue = loans.filter((l) => new Date(l.due_at).getTime() < Date.now()).length;

  const meta: [string, string | null][] = [
    ["Roll number", s.roll_no],
    ["Class / Department", s.class_dept],
    ["Email", s.email],
    ["Phone", s.phone],
  ];

  return (
    <PageShell
      title={s.name}
      subtitle={s.class_dept ?? "Student"}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/students" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist">← Students</Link>
          <Link href={`/students/${s.id}/edit`} className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-bold text-cream transition-colors hover:bg-navy-800">Edit</Link>
          <ConfirmDelete onDelete={deleteStudent.bind(null, s.id)} name={s.name} redirectTo="/students" />
        </div>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* identity card */}
        <div className="rounded-2xl border border-mist-deep bg-paper p-6 text-center">
          <div className="mx-auto w-fit">
            <Avatar name={s.name} src={s.photo_url} size={112} />
          </div>
          <h2 className="mt-4 font-display text-xl font-semibold text-navy-900">{s.name}</h2>
          {s.roll_no && <p className="mt-1 font-mono text-sm text-ink-mute">{s.roll_no}</p>}
          <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${s.status === "active" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
            {s.status === "active" ? "Active member" : "Blocked"}
          </span>
        </div>

        {/* details + activity */}
        <div className="space-y-8">
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {meta.map(([k, val]) => (
              <div key={k} className="border-b border-mist pb-3">
                <dt className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">{k}</dt>
                <dd className="mt-1 text-sm font-semibold text-navy-900">{val || <span className="font-normal text-ink-mute/60">—</span>}</dd>
              </div>
            ))}
          </dl>

          {/* borrowing activity */}
          <div>
            <h3 className="mb-3 font-display text-base font-semibold text-navy-900">Borrowing activity</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-mist-deep bg-paper p-4">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ink-mute">Current loans</p>
                <p className="mt-2 font-display text-2xl font-semibold text-navy-900">{loans.length}</p>
              </div>
              <div className="rounded-2xl border border-mist-deep bg-paper p-4">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ink-mute">Total borrowed</p>
                <p className="mt-2 font-display text-2xl font-semibold text-navy-900">{totalBorrowed ?? 0}</p>
              </div>
              <div className={`rounded-2xl border p-4 ${overdue ? "border-danger/30 bg-danger-soft" : "border-mist-deep bg-paper"}`}>
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ink-mute">Overdue</p>
                <p className={`mt-2 font-display text-2xl font-semibold ${overdue ? "text-danger" : "text-navy-900"}`}>{overdue}</p>
              </div>
              <Link href="/fines" className={`rounded-2xl border p-4 transition-colors ${outstandingFines > 0 ? "border-danger/30 bg-danger-soft hover:border-danger/50" : "border-mist-deep bg-paper hover:border-gold-500/50"}`}>
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ink-mute">Outstanding fines</p>
                <p className={`mt-2 font-display text-2xl font-semibold ${outstandingFines > 0 ? "text-danger" : "text-navy-900"}`}>{money(outstandingFines)}</p>
              </Link>
            </div>

            {loans.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-mist-deep">
                {loans.map((l) => {
                  const isOverdue = new Date(l.due_at).getTime() < Date.now();
                  return (
                    <Link key={l.id} href={`/books/${l.book?.id}`} className="flex items-center justify-between gap-3 border-b border-mist bg-paper px-4 py-3 last:border-0 hover:bg-mist/50">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-navy-900">{l.book?.title ?? "Unknown book"}</span>
                        <span className="block truncate text-xs text-ink-mute">{l.book?.author ?? ""}</span>
                      </span>
                      <span className={`flex-none rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold ${isOverdue ? "bg-danger text-white" : "bg-mist text-ink-soft"}`}>
                        Due {new Date(l.due_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
