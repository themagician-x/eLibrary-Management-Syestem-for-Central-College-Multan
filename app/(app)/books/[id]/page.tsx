import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import type { Book, WriteOffWithRefs } from "@/lib/types";
import DeleteButton from "@/components/DeleteButton";
import BookLabel from "@/components/BookLabel";
import BookFacts from "@/components/BookFacts";
import { money } from "@/lib/config";
import WriteOffButton from "../write-off-button";
import { deleteBook } from "../actions";

export const metadata: Metadata = { title: "Book" };

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("books").select("*").eq("id", id).single();
  if (!data) notFound();
  const book = data as Book;

  const [{ count: reservedCount }, { data: writeOffRows }] = await Promise.all([
    supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("book_id", id)
      .in("status", ["waiting", "ready"]),
    supabase
      .from("write_offs")
      .select("*, student:students(id,name,roll_no)")
      .eq("book_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const writeOffs = (writeOffRows ?? []) as unknown as WriteOffWithRefs[];

  return (
    <PageShell
      title={book.title}
      subtitle={book.author ?? "Unknown author"}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/books" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist">← Books</Link>
          <WriteOffButton bookId={book.id} bookTitle={book.title} disabled={book.available_copies < 1} />
          <Link href={`/books/${book.id}/edit`} className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-bold text-cream transition-colors hover:bg-navy-800">Edit</Link>
          <DeleteButton onDelete={deleteBook.bind(null, book.id)} name={`“${book.title}”`} title="Delete book" redirectTo="/books" />
        </div>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[220px_1fr_240px]">
        {/* cover */}
        <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-mist-deep bg-mist">
          {book.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-center">
              <span className="font-display text-sm font-semibold text-ink-mute">{book.title}</span>
            </div>
          )}
        </div>

        {/* details */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${book.available_copies > 0 ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
              {book.available_copies} of {book.total_copies} available
            </span>
            {reservedCount ? (
              <Link href="/reservations" className="inline-block rounded-full bg-gold-100 px-3 py-1 text-xs font-bold text-gold-700 hover:bg-gold-400/40">
                {reservedCount} in queue
              </Link>
            ) : null}
            {writeOffs.length > 0 && (
              <span className="inline-block rounded-full bg-warn-soft px-3 py-1 text-xs font-bold text-warn">
                {writeOffs.length} written off
              </span>
            )}
          </div>
          <BookFacts book={book} className="mt-5" />

          {writeOffs.length > 0 && (
            <div className="mt-6">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">Lost &amp; damaged</p>
              <ul className="mt-2 divide-y divide-mist rounded-xl border border-mist">
                {writeOffs.map((w) => (
                  <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[0.62rem] font-bold capitalize ${w.reason === "lost" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}>
                          {w.reason}
                        </span>
                        <span className="text-sm text-ink-soft">
                          {w.student?.name ?? "Shelf copy"}
                        </span>
                      </span>
                      {w.note && <span className="mt-0.5 block truncate text-xs text-ink-mute">{w.note}</span>}
                    </span>
                    <span className="flex flex-none items-center gap-3 text-xs text-ink-mute">
                      {Number(w.charge) > 0 && <span className="font-semibold text-navy-900">{money(Number(w.charge))}</span>}
                      {new Date(w.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* barcode label */}
        <BookLabel value={book.barcode ?? ""} title={book.title} shelf={book.shelf} />
      </div>
    </PageShell>
  );
}
