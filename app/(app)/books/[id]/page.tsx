import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import type { Book } from "@/lib/types";
import DeleteButton from "@/components/DeleteButton";
import BookLabel from "@/components/BookLabel";
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

  const { count: reservedCount } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("book_id", id)
    .in("status", ["waiting", "ready"]);

  const meta: [string, string | number | null][] = [
    ["Author", book.author],
    ["ISBN", book.isbn],
    ["Publisher", book.publisher],
    ["Year", book.published_year],
    ["Category", book.category],
    ["Language", book.language],
    ["Shelf", book.shelf],
  ];

  return (
    <PageShell
      title={book.title}
      subtitle={book.author ?? "Unknown author"}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/books" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist">← Books</Link>
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
          </div>
          <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {meta.map(([k, val]) => (
              <div key={k} className="border-b border-mist pb-3">
                <dt className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">{k}</dt>
                <dd className="mt-1 text-sm font-semibold text-navy-900">{val || <span className="font-normal text-ink-mute/60">—</span>}</dd>
              </div>
            ))}
          </dl>
          {book.description && (
            <div className="mt-6">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">Description</p>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">{book.description}</p>
            </div>
          )}
        </div>

        {/* barcode label */}
        <BookLabel value={book.barcode ?? ""} title={book.title} shelf={book.shelf} />
      </div>
    </PageShell>
  );
}
