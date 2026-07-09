import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import type { ReservationWithRefs } from "@/lib/types";
import ReservationActions from "./reservation-actions";

export const metadata: Metadata = { title: "Reservations" };

const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = "active" } = await searchParams;
  const history = filter === "history";
  const supabase = await createClient();

  const statuses = history ? ["fulfilled", "cancelled"] : ["waiting", "ready"];
  const { data, error } = await supabase
    .from("reservations")
    .select("*, book:books(id,title,author,available_copies), student:students(id,name,roll_no,photo_url)")
    .in("status", statuses)
    .order("created_at", { ascending: true });

  const list = (data ?? []) as unknown as ReservationWithRefs[];

  // queue position per book among 'waiting'
  const counter: Record<string, number> = {};
  const rows = list.map((r) => {
    let position = 0;
    if (r.status === "waiting") { counter[r.book_id] = (counter[r.book_id] ?? 0) + 1; position = counter[r.book_id]; }
    return { r, position };
  });
  if (!history) {
    rows.sort((a, b) => (a.r.status === "ready" ? 0 : 1) - (b.r.status === "ready" ? 0 : 1));
  } else {
    rows.reverse();
  }

  const readyCount = list.filter((r) => r.status === "ready").length;

  return (
    <PageShell
      title="Reservations"
      subtitle="Holds and the waiting queue."
      badge={`${list.length} ${list.length === 1 ? "hold" : "holds"}`}
      actions={
        <Link href="/reservations/new" className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-bold text-cream transition-colors hover:bg-navy-800">
          + Place a hold
        </Link>
      }
    >
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-navy-900">
            {history ? "Reservation history" : "Active holds"}
            {!history && readyCount > 0 && (
              <span className="ml-2 rounded-full bg-ok-soft px-2.5 py-0.5 text-xs font-bold text-ok">{readyCount} ready</span>
            )}
          </h2>
          <div className="flex items-center gap-1 rounded-xl border border-mist-deep bg-paper p-1 text-sm font-semibold">
            <Link href="/reservations" className={`rounded-lg px-3 py-1.5 ${!history ? "bg-navy-900 text-cream" : "text-ink-soft hover:bg-mist"}`}>Active</Link>
            <Link href="/reservations?filter=history" className={`rounded-lg px-3 py-1.5 ${history ? "bg-navy-900 text-cream" : "text-ink-soft hover:bg-mist"}`}>History</Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
            Couldn&rsquo;t load reservations: {error.message}
          </div>
        )}

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-mist-deep bg-paper p-12 text-center">
            <p className="font-display text-lg font-semibold text-navy-900">{history ? "No past reservations." : "No active holds."}</p>
            <p className="mt-1.5 text-sm text-ink-mute">{history ? "Fulfilled and cancelled holds will appear here." : "Place a hold above for a book that's currently out."}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-mist-deep">
            <div className="hidden grid-cols-[1.3fr_1.2fr_150px_120px_160px] gap-4 border-b border-mist-deep bg-mist px-5 py-3 font-mono text-[0.6rem] uppercase tracking-wider text-ink-mute lg:grid">
              <span>Book</span><span>Student</span><span>Status</span><span>Reserved</span><span className="text-right">Actions</span>
            </div>
            {rows.map(({ r, position }) => (
              <div key={r.id} className={`grid grid-cols-1 gap-2 border-b border-mist px-5 py-3.5 last:border-0 lg:grid-cols-[1.3fr_1.2fr_150px_120px_160px] lg:items-center lg:gap-4 ${r.status === "ready" ? "bg-ok-soft/30" : "bg-paper"}`}>
                <Link href={`/books/${r.book?.id}`} className="min-w-0">
                  <span className="block truncate font-semibold text-navy-900">{r.book?.title ?? "Unknown book"}</span>
                  <span className="block truncate text-xs text-ink-mute">{r.book?.author ?? ""}</span>
                </Link>
                <Link href={`/students/${r.student?.id}`} className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-navy-900">{r.student?.name ?? "Unknown"}</span>
                  <span className="block truncate text-xs text-ink-mute">{r.student?.roll_no ?? ""}</span>
                </Link>
                <span>
                  {r.status === "ready" ? (
                    <span className="inline-block rounded-full bg-ok px-2.5 py-0.5 text-[0.65rem] font-bold text-white">Ready for pickup</span>
                  ) : r.status === "waiting" ? (
                    <span className="inline-block rounded-full bg-mist px-2.5 py-0.5 text-[0.65rem] font-bold text-ink-soft">#{position} in queue</span>
                  ) : (
                    <span className="inline-block rounded-full bg-mist px-2.5 py-0.5 text-[0.65rem] font-bold capitalize text-ink-mute">{r.status}</span>
                  )}
                </span>
                <span className="text-sm text-ink-soft">{fmt(r.created_at)}</span>
                <div className="lg:justify-self-end">
                  {!history && (
                    <ReservationActions id={r.id} bookId={r.book_id} studentId={r.student_id} ready={r.status === "ready"} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
