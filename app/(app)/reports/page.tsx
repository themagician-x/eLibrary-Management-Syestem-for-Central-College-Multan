import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import BarList from "@/components/BarList";
import BookPeek from "@/components/BookPeek";
import StudentPeek from "@/components/StudentPeek";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/config";
import { resolvePeriod, todayInLibrary } from "@/lib/period";
import type { WriteOffWithRefs } from "@/lib/types";
import PeriodPicker from "./period-picker";

export const metadata: Metadata = { title: "Reports" };

const day = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const period = resolvePeriod(await searchParams);
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  // Two kinds of figure, kept apart because they answer different questions.
  // Activity happened *during* the period; the standing totals are true *now*
  // and do not change with it — the collection does not shrink because you
  // asked about August.
  const inPeriod = <T,>(q: T, column: string): T => {
    let out = q as unknown as {
      gte: (c: string, v: string) => unknown;
      lt: (c: string, v: string) => unknown;
    };
    if (period.from) out = out.gte(column, period.from.toISOString()) as typeof out;
    if (period.to) out = out.lt(column, period.to.toISOString()) as typeof out;
    return out as unknown as T;
  };

  const [
    { count: titles },
    { count: students },
    { count: onLoan },
    { count: overdue },
    { data: unpaid },
    { count: issuedInPeriod },
    { count: returnedInPeriod },
    { data: chargedInPeriod },
    { data: collectedInPeriod },
    { data: topBooks },
    { data: categories },
    { data: writeOffRows },
    { count: writeOffTotal },
  ] = await Promise.all([
    // standing totals — as of now, whatever period is selected
    supabase.from("books").select("*", { count: "exact", head: true }),
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("loans").select("*", { count: "exact", head: true }).is("returned_at", null),
    supabase.from("loans").select("*", { count: "exact", head: true }).is("returned_at", null).lt("due_at", nowIso),
    supabase.from("fines").select("amount").eq("status", "unpaid"),

    // activity within the period
    inPeriod(supabase.from("loans").select("*", { count: "exact", head: true }), "issued_at"),
    inPeriod(supabase.from("loans").select("*", { count: "exact", head: true }).not("returned_at", "is", null), "returned_at"),
    inPeriod(supabase.from("fines").select("amount"), "created_at"),
    // collected means money actually taken, so it counts by paid_at
    inPeriod(supabase.from("fines").select("amount").eq("status", "paid"), "paid_at"),

    supabase.rpc("top_books_between", {
      p_from: period.from?.toISOString() ?? null,
      p_to: period.to?.toISOString() ?? null,
      p_limit: 8,
    }),
    supabase.from("category_counts").select("*").order("book_count", { ascending: false }).limit(10),
    inPeriod(
      supabase
        .from("write_offs")
        .select("*, book:books(id,title,author), student:students(id,name,roll_no)")
        .order("created_at", { ascending: false })
        .limit(25),
      "created_at"
    ),
    inPeriod(supabase.from("write_offs").select("*", { count: "exact", head: true }), "created_at"),
  ]);

  const writeOffs = (writeOffRows ?? []) as unknown as WriteOffWithRefs[];
  const lostCount = writeOffs.filter((w) => w.reason === "lost").length;
  const damagedCount = writeOffs.length - lostCount;
  const writeOffCharged = writeOffs.reduce((s, w) => s + Number(w.charge), 0);

  const sum = (rows: { amount: number | string }[] | null) =>
    (rows ?? []).reduce((s, r) => s + Number(r.amount), 0);

  const outstanding = sum(unpaid);
  const charged = sum(chargedInPeriod);
  const collected = sum(collectedInPeriod);

  const activity = [
    { label: "Books borrowed", value: String(issuedInPeriod ?? 0) },
    { label: "Books returned", value: String(returnedInPeriod ?? 0) },
    { label: "Fines charged", value: money(charged) },
    { label: "Fines collected", value: money(collected) },
    { label: "Lost / damaged", value: String(writeOffTotal ?? 0), alert: (writeOffTotal ?? 0) > 0 },
  ];

  const standing = [
    { label: "Titles", value: String(titles ?? 0) },
    { label: "Students", value: String(students ?? 0) },
    { label: "On loan now", value: String(onLoan ?? 0) },
    { label: "Overdue", value: String(overdue ?? 0), alert: (overdue ?? 0) > 0 },
    { label: "Outstanding fines", value: money(outstanding), alert: outstanding > 0 },
  ];

  type TopBook = { title: string; author: string | null; loan_count: number };
  const topBookItems = ((topBooks ?? []) as TopBook[]).map((b) => ({
    label: b.title,
    value: Number(b.loan_count),
    sub: b.author ?? undefined,
  }));
  const categoryItems = (categories ?? []).map((c) => ({
    label: c.category as string,
    value: c.book_count as number,
  }));

  return (
    <PageShell
      title="Reports"
      subtitle="A snapshot of the library."
      actions={<PeriodPicker period={period} today={todayInLibrary()} />}
    >

      {/* what happened during the chosen period */}
      <h2 className="mt-6 flex flex-wrap items-baseline gap-x-2 font-display text-lg font-semibold text-navy-900">
        Activity
        <span className="font-sans text-sm font-normal text-ink-mute">
          {period.key === "all" ? "over all time" : `in ${period.label}`}
        </span>
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {activity.map((k) => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.alert ? "border-danger/25 bg-danger-soft" : "border-mist-deep bg-paper"}`}>
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ink-mute">{k.label}</p>
            <p className={`mt-2 font-display text-2xl font-semibold tabular-nums ${k.alert ? "text-danger" : "text-navy-900"}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* true now, whatever period is selected */}
      <h2 className="mt-8 flex flex-wrap items-baseline gap-x-2 font-display text-lg font-semibold text-navy-900">
        Right now
        <span className="font-sans text-sm font-normal text-ink-mute">the standing position, whatever period is chosen</span>
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {standing.map((k) => (
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
          <p className="mb-5 text-sm text-ink-mute">
            Top titles by loans {period.key === "all" ? "over all time" : `in ${period.label}`}.
          </p>
          <BarList items={topBookItems} emptyLabel="No loans in this period." />
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
              Copies retired {period.key === "all" ? "from the inventory" : `in ${period.label}`}
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
            {period.key === "all"
              ? "No copies written off. The whole collection is accounted for. 🎉"
              : `No copies were written off in ${period.label}. 🎉`}
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
                    <BookPeek bookId={w.book?.id} className="group -my-1 min-w-0 py-1.5 text-left">
                      <span className="block truncate text-sm font-semibold text-navy-900 group-hover:text-navy-700">
                        {w.book?.title ?? "Deleted book"}
                      </span>
                    </BookPeek>
                  </div>
                  <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1 text-xs text-ink-mute">
                    {w.student ? (
                      <StudentPeek studentId={w.student.id} className="group -my-1 min-w-0 py-1.5 text-left">
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
