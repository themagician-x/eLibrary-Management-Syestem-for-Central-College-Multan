import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import type { LoanWithRefs } from "@/lib/types";
import BookPeek from "@/components/BookPeek";
import StudentPeek from "@/components/StudentPeek";
import LoanActions from "./loan-actions";

export const metadata: Metadata = { title: "Circulation" };

const DAY = 86_400_000;

function dueInfo(dueAt: string) {
  const diff = new Date(dueAt).getTime() - Date.now();
  const days = Math.ceil(diff / DAY);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, cls: "bg-danger-soft text-danger", overdue: true };
  if (days === 0) return { label: "Due today", cls: "bg-warn-soft text-warn", overdue: false };
  if (days <= 3) return { label: `Due in ${days}d`, cls: "bg-warn-soft text-warn", overdue: false };
  return { label: `Due in ${days}d`, cls: "bg-mist text-ink-soft", overdue: false };
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default async function CirculationPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = "" } = await searchParams;
  const supabase = await createClient();
  const settings = await getSettings();

  let query = supabase
    .from("loans")
    .select("*, book:books(id,title,author,barcode,cover_url), student:students(id,name,roll_no,photo_url)")
    .is("returned_at", null)
    .order("due_at", { ascending: true });

  if (filter === "overdue") query = query.lt("due_at", new Date().toISOString());

  const [{ data, error }, { count: onLoanCount }] = await Promise.all([
    query,
    supabase.from("loans").select("*", { count: "exact", head: true }).is("returned_at", null),
  ]);
  const loans = (data ?? []) as unknown as LoanWithRefs[];

  const overdueCount = loans.filter((l) => new Date(l.due_at).getTime() < Date.now()).length;

  return (
    <PageShell
      title="Circulation"
      subtitle="Issue, return and renew books."
      badge={`${onLoanCount ?? 0} on loan`}
      actions={
        <Link href="/circulation/issue" className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-bold text-cream transition-colors hover:bg-navy-800">
          + Issue a book
        </Link>
      }
    >
      {/* current loans */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-navy-900">
            {filter === "overdue" ? "Overdue books" : "Books on loan"}
          </h2>
          <div className="flex items-center gap-1 rounded-xl border border-mist-deep bg-paper p-1 text-sm font-semibold">
            <Link href="/circulation" className={`rounded-lg px-3 py-1.5 ${filter !== "overdue" ? "bg-navy-900 text-cream" : "text-ink-soft hover:bg-mist"}`}>
              All{filter !== "overdue" ? ` (${loans.length})` : ""}
            </Link>
            <Link href="/circulation?filter=overdue" className={`rounded-lg px-3 py-1.5 ${filter === "overdue" ? "bg-danger text-white" : "text-ink-soft hover:bg-mist"}`}>
              Overdue{overdueCount > 0 ? ` (${overdueCount})` : ""}
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
            Couldn&rsquo;t load loans: {error.message}
          </div>
        )}

        {loans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-mist-deep bg-paper p-12 text-center">
            <p className="font-display text-lg font-semibold text-navy-900">
              {filter === "overdue" ? "Nothing overdue. 🎉" : "No books are on loan."}
            </p>
            <p className="mt-1.5 text-sm text-ink-mute">
              {filter === "overdue" ? "Every borrowed book is within its due date." : "Issue a book above to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-mist-deep">
            <div className="hidden grid-cols-[1.4fr_1.2fr_130px_140px_150px] gap-4 border-b border-mist-deep bg-mist px-5 py-3 font-mono text-[0.6rem] uppercase tracking-wider text-ink-mute lg:grid">
              <span>Book</span><span>Student</span><span>Issued</span><span>Due</span><span className="text-right">Actions</span>
            </div>
            {loans.map((l) => {
              const d = dueInfo(l.due_at);
              return (
                <div key={l.id} className={`grid grid-cols-1 gap-3 border-b border-mist px-5 py-3.5 last:border-0 lg:grid-cols-[1.4fr_1.2fr_130px_140px_150px] lg:items-center lg:gap-4 ${d.overdue ? "bg-danger-soft/30" : "bg-paper"}`}>
                  <BookPeek bookId={l.book?.id} className="group min-w-0 text-left">
                    <span className="block truncate font-semibold text-navy-900 group-hover:text-navy-700">{l.book?.title ?? "Unknown book"}</span>
                    <span className="block truncate text-xs text-ink-mute">{l.book?.author ?? ""}{l.renew_count > 0 ? ` · renewed ${l.renew_count}×` : ""}</span>
                  </BookPeek>
                  <StudentPeek studentId={l.student?.id} className="group min-w-0 text-left">
                    <span className="block truncate text-sm font-semibold text-navy-900 group-hover:text-navy-700">{l.student?.name ?? "Unknown"}</span>
                    <span className="block truncate text-xs text-ink-mute">{l.student?.roll_no ?? ""}</span>
                  </StudentPeek>
                  <span className="text-sm text-ink-soft">{fmt(l.issued_at)}</span>
                  <span><span className={`inline-block rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold ${d.cls}`}>{d.label}</span></span>
                  <div className="lg:justify-self-end">
                    <LoanActions loanId={l.id} canRenew={l.renew_count < settings.max_renews} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
