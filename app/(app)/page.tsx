import Link from "next/link";
import PageShell from "@/components/PageShell";
import BarList from "@/components/BarList";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/config";
import type { LoanWithRefs, ReservationWithRefs } from "@/lib/types";

const fmtDue = (d: string) => {
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
  return days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "due today" : `due in ${days}d`;
};

export default async function Dashboard() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [
    { count: titles },
    { count: students },
    { count: onLoan },
    { count: overdue },
    { count: readyHolds },
    { data: unpaid },
    { data: overdueList },
    { data: readyList },
    { data: topBooks },
  ] = await Promise.all([
    supabase.from("books").select("*", { count: "exact", head: true }),
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("loans").select("*", { count: "exact", head: true }).is("returned_at", null),
    supabase.from("loans").select("*", { count: "exact", head: true }).is("returned_at", null).lt("due_at", nowIso),
    supabase.from("reservations").select("*", { count: "exact", head: true }).eq("status", "ready"),
    supabase.from("fines").select("amount").eq("status", "unpaid"),
    supabase.from("loans").select("id,due_at,book:books(id,title),student:students(id,name,roll_no)").is("returned_at", null).lt("due_at", nowIso).order("due_at", { ascending: true }).limit(5),
    supabase.from("reservations").select("id,book:books(id,title),student:students(id,name)").eq("status", "ready").order("ready_at", { ascending: true }).limit(5),
    supabase.from("book_loan_counts").select("*").gt("loan_count", 0).order("loan_count", { ascending: false }).limit(5),
  ]);

  const outstanding = (unpaid ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const overdues = (overdueList ?? []) as unknown as LoanWithRefs[];
  const readies = (readyList ?? []) as unknown as ReservationWithRefs[];
  const topItems = (topBooks ?? []).map((b) => ({ label: b.title as string, value: b.loan_count as number, sub: (b.author as string) ?? undefined }));

  const tiles = [
    { label: "Titles", value: String(titles ?? 0), href: "/books" },
    { label: "Students", value: String(students ?? 0), href: "/students" },
    { label: "On loan", value: String(onLoan ?? 0), href: "/circulation" },
    { label: "Overdue", value: String(overdue ?? 0), href: "/circulation?filter=overdue", alert: (overdue ?? 0) > 0 },
    { label: "Ready holds", value: String(readyHolds ?? 0), href: "/reservations", good: (readyHolds ?? 0) > 0 },
    { label: "Outstanding fines", value: money(outstanding), href: "/fines", alert: outstanding > 0 },
  ];

  return (
    <PageShell title="Dashboard" subtitle="Central College Library at a glance.">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className={`rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(5,31,66,0.07)] ${t.alert ? "border-danger/25 bg-danger-soft" : t.good ? "border-ok/25 bg-ok-soft" : "border-mist-deep bg-paper"}`}>
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-ink-mute">{t.label}</p>
            <p className={`mt-2 font-display text-2xl font-semibold tabular-nums ${t.alert ? "text-danger" : t.good ? "text-ok" : "text-navy-900"}`}>{t.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* needs attention */}
        <section className="rounded-2xl border border-mist-deep bg-paper p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-navy-900">Needs attention</h2>

          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-mute">Overdue books</p>
            {overdues.length > 0 && <Link href="/circulation?filter=overdue" className="text-xs font-semibold text-gold-700 hover:text-navy-900">View all</Link>}
          </div>
          {overdues.length === 0 ? (
            <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm font-medium text-ok">Nothing overdue. 🎉</p>
          ) : (
            <ul className="divide-y divide-mist rounded-xl border border-mist">
              {overdues.map((l) => (
                <li key={l.id}>
                  <Link href={`/students/${l.student?.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-mist/50">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-navy-900">{l.book?.title}</span>
                      <span className="block truncate text-xs text-ink-mute">{l.student?.name} · {l.student?.roll_no}</span>
                    </span>
                    <span className="flex-none rounded-full bg-danger px-2.5 py-0.5 text-[0.65rem] font-bold text-white">{fmtDue(l.due_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mb-2 mt-6 flex items-center justify-between">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-mute">Ready for pickup</p>
            {readies.length > 0 && <Link href="/reservations" className="text-xs font-semibold text-gold-700 hover:text-navy-900">View all</Link>}
          </div>
          {readies.length === 0 ? (
            <p className="rounded-xl bg-mist px-4 py-3 text-sm text-ink-mute">No holds waiting for pickup.</p>
          ) : (
            <ul className="divide-y divide-mist rounded-xl border border-mist">
              {readies.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-navy-900">{r.book?.title}</span>
                    <span className="block truncate text-xs text-ink-mute">{r.student?.name}</span>
                  </span>
                  <span className="flex-none rounded-full bg-ok px-2.5 py-0.5 text-[0.65rem] font-bold text-white">Ready</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* most borrowed */}
        <section className="rounded-2xl border border-mist-deep bg-paper p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-navy-900">Most borrowed</h2>
            <Link href="/reports" className="text-xs font-semibold text-gold-700 hover:text-navy-900">All reports</Link>
          </div>
          <BarList items={topItems} emptyLabel="No loans recorded yet." />
        </section>
      </div>
    </PageShell>
  );
}
