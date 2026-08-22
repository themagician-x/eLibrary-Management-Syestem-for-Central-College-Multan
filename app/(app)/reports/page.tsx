import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import BarList from "@/components/BarList";
import BookPeek from "@/components/BookPeek";
import StudentPeek from "@/components/StudentPeek";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/config";
import type { WriteOffWithRefs } from "@/lib/types";
import PrintButton from "./print-button";

export const metadata: Metadata = { title: "Reports" };

const day = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default async function ReportsPage() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [
    { count: titles },
    { count: students },
    { count: totalLoans },
    { count: onLoan },
    { count: overdue },
    { data: unpaid },
    { data: collected },
    { data: topBooks },
    { data: categories },
    { data: writeOffRows },
    { count: writeOffTotal },
  ] = await Promise.all([
    supabase.from("books").select("*", { count: "exact", head: true }),
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("loans").select("*", { count: "exact", head: true }),
    supabase.from("loans").select("*", { count: "exact", head: true }).is("returned_at", null),
    supabase.from("loans").select("*", { count: "exact", head: true }).is("returned_at", null).lt("due_at", nowIso),
    supabase.from("fines").select("amount").eq("status", "unpaid"),
    supabase.from("fines").select("amount").eq("status", "paid"),
    supabase.from("book_loan_counts").select("*").gt("loan_count", 0).order("loan_count", { ascending: false }).limit(8),
    supabase.from("category_counts").select("*").order("book_count", { ascending: false }).limit(10),
    supabase
      .from("write_offs")
      .select("*, book:books(id,title,author), student:students(id,name,roll_no)")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase.from("write_offs").select("*", { count: "exact", head: true }),
  ]);

  const writeOffs = (writeOffRows ?? []) as unknown as WriteOffWithRefs[];
  const lostCount = writeOffs.filter((w) => w.reason === "lost").length;
  const damagedCount = writeOffs.length - lostCount;
  const writeOffCharged = writeOffs.reduce((s, w) => s + Number(w.charge), 0);

  const outstanding = (unpaid ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const collectedTotal = (collected ?? []).reduce((s, r) => s + Number(r.amount), 0);

  const kpis = [
    { label: "Titles", value: String(titles ?? 0) },
    { label: "Students", value: String(students ?? 0) },
    { label: "Loans (all time)", value: String(totalLoans ?? 0) },
    { label: "On loan now", value: String(onLoan ?? 0) },
    { label: "Overdue", value: String(overdue ?? 0), alert: (overdue ?? 0) > 0 },
    { label: "Outstanding fines", value: money(outstanding), alert: outstanding > 0 },
    { label: "Fines collected", value: money(collectedTotal) },
    { label: "Lost / damaged", value: String(writeOffTotal ?? 0), alert: (writeOffTotal ?? 0) > 0 },
  ];

  const topBookItems = (topBooks ?? []).map((b) => ({
    label: b.title as string,
    value: b.loan_count as number,
    sub: (b.author as string) ?? undefined,
  }));
  const categoryItems = (categories ?? []).map((c) => ({
    label: c.category as string,
    value: c.book_count as number,
  }));

  return (
    <PageShell
      title="Reports"
      subtitle="A snapshot of the library."
      actions={<PrintButton />}
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.alert ? "border-danger/25 bg-danger-soft" : "border-mist-deep bg-paper"}`}>
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ink-mute">{k.label}</p>
            <p className={`mt-2 font-display text-2xl font-semibold tabular-nums ${k.alert ? "text-danger" : "text-navy-900"}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-mist-deep bg-paper p-6">
          <h2 className="font-display text-lg font-semibold text-navy-900">Most borrowed</h2>
          <p className="mb-5 text-sm text-ink-mute">Top titles by number of loans.</p>
          <BarList items={topBookItems} emptyLabel="No loans recorded yet." />
        </section>

        <section className="rounded-2xl border border-mist-deep bg-paper p-6">
          <h2 className="font-display text-lg font-semibold text-navy-900">Books by category</h2>
          <p className="mb-5 text-sm text-ink-mute">How the collection is distributed.</p>
          <BarList items={categoryItems} emptyLabel="No books catalogued yet." />
        </section>
      </div>

      {/* lost & damaged */}
      <section className="mt-6 rounded-2xl border border-mist-deep bg-paper p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-navy-900">Lost &amp; damaged</h2>
            <p className="text-sm text-ink-mute">
              Copies retired from the inventory
              {(writeOffTotal ?? 0) > writeOffs.length ? ` — latest ${writeOffs.length} of ${writeOffTotal}` : ""}.
            </p>
          </div>
          {writeOffs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="rounded-full bg-danger-soft px-3 py-1 text-danger">{lostCount} lost</span>
              <span className="rounded-full bg-warn-soft px-3 py-1 text-warn">{damagedCount} damaged</span>
              {writeOffCharged > 0 && (
                <span className="rounded-full bg-mist px-3 py-1 text-ink-soft">{money(writeOffCharged)} charged</span>
              )}
            </div>
          )}
        </div>

        {writeOffs.length === 0 ? (
          <p className="mt-4 rounded-xl bg-ok-soft px-4 py-3 text-sm font-medium text-ok">
            No copies written off. The whole collection is accounted for. 🎉
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-mist rounded-xl border border-mist">
            {writeOffs.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[0.62rem] font-bold capitalize ${w.reason === "lost" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}>
                      {w.reason}
                    </span>
                    <BookPeek bookId={w.book?.id} className="group min-w-0 text-left">
                      <span className="block truncate text-sm font-semibold text-navy-900 group-hover:text-navy-700">
                        {w.book?.title ?? "Deleted book"}
                      </span>
                    </BookPeek>
                  </div>
                  <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1 text-xs text-ink-mute">
                    {w.student ? (
                      <StudentPeek studentId={w.student.id} className="group min-w-0 text-left">
                        <span className="block truncate group-hover:text-navy-900">
                          {w.student.name}
                          {w.student.roll_no ? ` · ${w.student.roll_no}` : ""}
                        </span>
                      </StudentPeek>
                    ) : (
                      <span>Shelf copy</span>
                    )}
                    {w.note ? <span className="min-w-0 truncate">— {w.note}</span> : null}
                  </div>
                </div>
                <span className="flex flex-none items-center gap-3 text-xs text-ink-mute">
                  {Number(w.charge) > 0 && <span className="font-semibold text-navy-900">{money(Number(w.charge))}</span>}
                  {day(w.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
