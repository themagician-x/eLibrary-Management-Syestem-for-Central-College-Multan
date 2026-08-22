import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/config";
import { getSettings } from "@/lib/settings";
import type { FineWithRefs } from "@/lib/types";
import Pagination, { pageFrom, rangeFor } from "@/components/Pagination";
import FinesTable from "./fines-table";

export const metadata: Metadata = { title: "Fines" };

export default async function FinesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status = "unpaid", page: pageParam } = await searchParams;
  const page = pageFrom(pageParam);
  const supabase = await createClient();
  const { fine_per_day } = await getSettings();

  let query = supabase
    .from("fines")
    .select(
      "*, student:students(id,name,roll_no), book:books(id,title), loan:loans(issued_at,due_at,returned_at,renew_count,book:books(id,title))",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });
  if (["unpaid", "paid", "waived"].includes(status)) query = query.eq("status", status);

  const [from, to] = rangeFor(page);

  const [{ data, error, count }, { data: unpaidRows }, { data: paidRows }, { count: totalFines }] = await Promise.all([
    query.range(from, to),
    supabase.from("fines").select("amount").eq("status", "unpaid"),
    supabase.from("fines").select("amount").eq("status", "paid"),
    supabase.from("fines").select("*", { count: "exact", head: true }),
  ]);

  const fines = (data ?? []) as unknown as FineWithRefs[];
  const total = count ?? 0;
  const outstanding = (unpaidRows ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const collected = (paidRows ?? []).reduce((s, r) => s + Number(r.amount), 0);

  const tabs = [
    { key: "unpaid", label: "Unpaid" },
    { key: "paid", label: "Paid" },
    { key: "waived", label: "Waived" },
    { key: "all", label: "All" },
  ];

  return (
    <PageShell
      title="Fines"
      subtitle="Late fees, lost and damaged charges."
      fill
      badge={`${totalFines ?? 0} ${totalFines === 1 ? "charge" : "charges"}`}
      actions={
        <Link href="/fines/new" className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-bold text-cream transition-colors hover:bg-navy-800">
          + Add charge
        </Link>
      }
    >
      {/* summary */}
      <div className="mb-5 grid shrink-0 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-danger/25 bg-danger-soft p-5">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-danger/80">Outstanding</p>
          <p className="mt-2 font-display text-3xl font-semibold text-danger">{money(outstanding)}</p>
        </div>
        <div className="rounded-2xl border border-ok/25 bg-ok-soft p-5">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ok/80">Collected</p>
          <p className="mt-2 font-display text-3xl font-semibold text-ok">{money(collected)}</p>
        </div>
        <div className="rounded-2xl border border-mist-deep bg-paper p-5">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ink-mute">Fine rate</p>
          <p className="mt-2 font-display text-3xl font-semibold text-navy-900">{money(fine_per_day)}<span className="text-base font-normal text-ink-mute">/day</span></p>
        </div>
      </div>

      {/* filter tabs */}
      <div className="mb-4 flex w-full shrink-0 items-center gap-1 rounded-xl border border-mist-deep bg-paper p-1 text-sm font-semibold">
        {tabs.map((t) => (
          <Link key={t.key} href={`/fines?status=${t.key}`} className={`flex-1 rounded-lg px-3.5 py-1.5 text-center ${status === t.key ? "bg-navy-900 text-cream" : "text-ink-soft hover:bg-mist"}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          Couldn&rsquo;t load fines: {error.message}
        </div>
      )}

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-mist-deep bg-paper p-12 text-center">
          <p className="font-display text-lg font-semibold text-navy-900">
            {status === "unpaid" ? "No outstanding fines. 🎉" : "Nothing here."}
          </p>
          <p className="mt-1.5 text-sm text-ink-mute">Late fees are added automatically when overdue books are returned.</p>
        </div>
      ) : (
        <FinesTable fines={fines} />
      )}

      {total > 0 && (
        <Pagination
          page={page}
          total={total}
          basePath="/fines"
          params={{ status }}
          noun="charge"
        />
      )}
    </PageShell>
  );
}
