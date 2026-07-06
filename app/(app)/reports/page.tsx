import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import BarList from "@/components/BarList";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/config";
import PrintButton from "./print-button";

export const metadata: Metadata = { title: "Reports" };

const exports = [
  { type: "books", label: "Books" },
  { type: "students", label: "Students" },
  { type: "loans", label: "Loans" },
  { type: "fines", label: "Fines" },
];

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
  ]);

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
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
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

      {/* exports */}
      <section className="no-print mt-8 rounded-2xl border border-mist-deep bg-paper p-6">
        <h2 className="font-display text-lg font-semibold text-navy-900">Export data</h2>
        <p className="mb-4 text-sm text-ink-mute">Download any table as a CSV spreadsheet.</p>
        <div className="flex flex-wrap gap-3">
          {exports.map((e) => (
            <a
              key={e.type}
              href={`/api/export/${e.type}`}
              className="flex items-center gap-2 rounded-xl border border-mist-deep px-4 py-2.5 text-sm font-bold text-navy-900 transition-colors hover:border-gold-500 hover:bg-mist"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
              {e.label} CSV
            </a>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
