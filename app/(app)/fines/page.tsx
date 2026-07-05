import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/config";
import type { FineWithRefs } from "@/lib/types";
import AddCharge from "./add-charge";
import FineActions from "./fine-actions";

export const metadata: Metadata = { title: "Fines" };

const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const reasonStyle: Record<string, string> = {
  late: "bg-warn-soft text-warn",
  lost: "bg-danger-soft text-danger",
  damaged: "bg-warn-soft text-warn",
};
const statusStyle: Record<string, string> = {
  unpaid: "bg-danger-soft text-danger",
  paid: "bg-ok-soft text-ok",
  waived: "bg-mist text-ink-mute",
};

export default async function FinesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "unpaid" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("fines")
    .select("*, student:students(id,name,roll_no,photo_url), loan:loans(book:books(id,title))")
    .order("created_at", { ascending: false });
  if (["unpaid", "paid", "waived"].includes(status)) query = query.eq("status", status);

  const [{ data, error }, { data: unpaidRows }, { data: paidRows }] = await Promise.all([
    query,
    supabase.from("fines").select("amount").eq("status", "unpaid"),
    supabase.from("fines").select("amount").eq("status", "paid"),
  ]);

  const fines = (data ?? []) as unknown as FineWithRefs[];
  const outstanding = (unpaidRows ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const collected = (paidRows ?? []).reduce((s, r) => s + Number(r.amount), 0);

  const tabs = [
    { key: "unpaid", label: "Unpaid" },
    { key: "paid", label: "Paid" },
    { key: "waived", label: "Waived" },
    { key: "all", label: "All" },
  ];

  return (
    <PageShell title="Fines" subtitle="Late fees, lost and damaged charges." actions={<AddCharge />}>
      {/* summary */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
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
          <p className="mt-2 font-display text-3xl font-semibold text-navy-900">{money(5)}<span className="text-base font-normal text-ink-mute">/day</span></p>
        </div>
      </div>

      {/* filter tabs */}
      <div className="mb-5 flex flex-wrap items-center gap-1 rounded-xl border border-mist-deep bg-paper p-1 text-sm font-semibold sm:w-fit">
        {tabs.map((t) => (
          <Link key={t.key} href={`/fines?status=${t.key}`} className={`rounded-lg px-3.5 py-1.5 ${status === t.key ? "bg-navy-900 text-cream" : "text-ink-soft hover:bg-mist"}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          Couldn&rsquo;t load fines: {error.message}
        </div>
      )}

      {fines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-mist-deep bg-paper p-12 text-center">
          <p className="font-display text-lg font-semibold text-navy-900">
            {status === "unpaid" ? "No outstanding fines. 🎉" : "Nothing here."}
          </p>
          <p className="mt-1.5 text-sm text-ink-mute">Late fees are added automatically when overdue books are returned.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-mist-deep">
          <div className="hidden grid-cols-[1.3fr_1fr_100px_110px_190px] gap-4 border-b border-mist-deep bg-mist px-5 py-3 font-mono text-[0.6rem] uppercase tracking-wider text-ink-mute lg:grid">
            <span>Student</span><span>Reason</span><span>Amount</span><span>Date</span><span className="text-right">Status / Actions</span>
          </div>
          {fines.map((f) => (
            <div key={f.id} className="grid grid-cols-1 gap-2 border-b border-mist bg-paper px-5 py-3.5 last:border-0 lg:grid-cols-[1.3fr_1fr_100px_110px_190px] lg:items-center lg:gap-4">
              <Link href={`/students/${f.student?.id}`} className="min-w-0">
                <span className="block truncate font-semibold text-navy-900">{f.student?.name ?? "Unknown"}</span>
                <span className="block truncate text-xs text-ink-mute">{f.student?.roll_no ?? ""}</span>
              </Link>
              <span className="min-w-0">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold capitalize ${reasonStyle[f.reason]}`}>{f.reason}</span>
                <span className="mt-0.5 block truncate text-xs text-ink-mute">{f.loan?.book?.title ?? f.note ?? ""}</span>
              </span>
              <span className="font-display text-base font-semibold text-navy-900">{money(f.amount)}</span>
              <span className="text-sm text-ink-soft">{fmt(f.created_at)}</span>
              <div className="flex items-center justify-between gap-2 lg:justify-end">
                {f.status !== "unpaid" && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold capitalize ${statusStyle[f.status]} lg:hidden`}>{f.status}</span>
                )}
                <FineActions id={f.id} status={f.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
