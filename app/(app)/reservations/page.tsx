import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import type { ReservationWithRefs } from "@/lib/types";
import BookPeek from "@/components/BookPeek";
import StudentPeek from "@/components/StudentPeek";
import TableScroll from "@/components/TableScroll";
import Pagination, { pageFrom, rangeFor } from "@/components/Pagination";
import ReservationActions from "./reservation-actions";

export const metadata: Metadata = { title: "Reservations" };

const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const { filter = "active", page: pageParam } = await searchParams;
  const page = pageFrom(pageParam);
  const history = filter === "history";
  const supabase = await createClient();

  const statuses = history ? ["fulfilled", "cancelled"] : ["waiting", "ready"];
  const [from, to] = rangeFor(page);

  // Queue position is a rank across the whole queue, so it cannot be counted
  // from one page of rows. Two ids per waiting hold is cheap to fetch in full,
  // and ranking them here keeps "3rd in queue" true on every page.
  const [{ data, error, count }, { count: readyTotal }, { data: waitingRows }] =
    await Promise.all([
      supabase
        .from("reservations")
        .select(
          "*, book:books(id,title,author,available_copies), student:students(id,name,roll_no)",
          { count: "exact" }
        )
        .in("status", statuses)
        .order("created_at", { ascending: true })
        .range(from, to),
      supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("status", "ready"),
      history
        ? Promise.resolve({ data: [] })
        : supabase
            .from("reservations")
            .select("id,book_id")
            .eq("status", "waiting")
            .order("created_at", { ascending: true }),
    ]);

  const list = (data ?? []) as unknown as ReservationWithRefs[];
  const total = count ?? 0;

  // rank every waiting hold once, then look each visible row up by id
  const rank: Record<string, number> = {};
  const perBook: Record<string, number> = {};
  for (const w of (waitingRows ?? []) as { id: string; book_id: string }[]) {
    perBook[w.book_id] = (perBook[w.book_id] ?? 0) + 1;
    rank[w.id] = perBook[w.book_id];
  }

  const rows = list.map((r) => ({ r, position: rank[r.id] ?? 0 }));
  if (!history) {
    rows.sort((a, b) => (a.r.status === "ready" ? 0 : 1) - (b.r.status === "ready" ? 0 : 1));
  } else {
    rows.reverse();
  }

  const readyCount = readyTotal ?? 0;

  return (
    <PageShell
      title="Reservations"
      subtitle="Holds and the waiting queue."
      fill
      badge={`${total.toLocaleString()} ${total === 1 ? "hold" : "holds"}`}
      actions={
        <Link href="/reservations/new" className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-bold text-cream transition-colors hover:bg-navy-800">
          + Place a hold
        </Link>
      }
    >
      <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
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

        {total === 0 ? (
          <div className="rounded-2xl border border-dashed border-mist-deep bg-paper p-12 text-center">
            <p className="font-display text-lg font-semibold text-navy-900">{history ? "No past reservations." : "No active holds."}</p>
            <p className="mt-1.5 text-sm text-ink-mute">{history ? "Fulfilled and cancelled holds will appear here." : "Place a hold above for a book that's currently out."}</p>
          </div>
        ) : (
          <TableScroll
            header={
              <div className="hidden grid-cols-[1.3fr_1.2fr_150px_120px_160px] gap-4 border-b border-mist-deep bg-mist px-5 py-3 font-mono text-[0.6rem] uppercase tracking-wider text-ink-mute lg:grid">
                <span>Book</span><span>Student</span><span>Status</span><span>Reserved</span><span className="text-right">Actions</span>
              </div>
            }
          >
            {rows.map(({ r, position }) => (
              <div key={r.id} className={`grid grid-cols-1 gap-2 border-b border-mist px-5 py-3.5 last:border-0 lg:grid-cols-[1.3fr_1.2fr_150px_120px_160px] lg:items-center lg:gap-4 ${r.status === "ready" ? "bg-ok-soft/30" : "bg-paper"}`}>
                <BookPeek bookId={r.book?.id} className="group min-w-0 text-left">
                  <span className="block truncate font-semibold text-navy-900 group-hover:text-navy-700">{r.book?.title ?? "Unknown book"}</span>
                  <span className="block truncate text-xs text-ink-mute">{r.book?.author ?? ""}</span>
                </BookPeek>
                <StudentPeek studentId={r.student?.id} className="group min-w-0 text-left">
                  <span className="block truncate text-sm font-semibold text-navy-900 group-hover:text-navy-700">{r.student?.name ?? "Unknown"}</span>
                  <span className="block truncate text-xs text-ink-mute">{r.student?.roll_no ?? ""}</span>
                </StudentPeek>
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
                    <ReservationActions
                      id={r.id}
                      bookId={r.book_id}
                      studentId={r.student_id}
                      ready={r.status === "ready"}
                      bookTitle={r.book?.title ?? "the book"}
                      student={r.student?.name ?? "the student"}
                    />
                  )}
                </div>
              </div>
            ))}
          </TableScroll>
        )}

        {total > 0 && (
          <Pagination
            page={page}
            total={total}
            basePath="/reservations"
            params={{ filter: history ? "history" : undefined }}
            noun="hold"
          />
        )}
      </div>
    </PageShell>
  );
}
