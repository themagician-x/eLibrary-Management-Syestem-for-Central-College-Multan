import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import Select from "@/components/Select";
import { createClient } from "@/lib/supabase/server";
import type { Book } from "@/lib/types";
import DeleteBookButton from "./delete-book-button";

export const metadata: Metadata = { title: "Books" };

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q = "", category = "" } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("books").select("*").order("created_at", { ascending: false });
  if (q.trim()) {
    const term = q.trim();
    query = query.or(`title.ilike.%${term}%,author.ilike.%${term}%,isbn.ilike.%${term}%`);
  }
  if (category) query = query.eq("category", category);

  const { data: books, error } = await query;

  // distinct categories for the filter
  const { data: catRows } = await supabase.from("books").select("category").not("category", "is", null);
  const categories = [...new Set((catRows ?? []).map((r) => r.category).filter(Boolean))].sort() as string[];

  const list = (books ?? []) as Book[];
  const filtering = Boolean(q || category);

  return (
    <PageShell
      title="Books"
      subtitle="The library catalogue."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/books/import" className="rounded-xl border border-navy-900 px-4 py-2 text-sm font-bold text-navy-900 transition-colors hover:bg-navy-900 hover:text-cream">
            Import CSV
          </Link>
          <Link href="/books/new" className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-bold text-cream transition-colors hover:bg-navy-800">
            + Add book
          </Link>
        </div>
      }
    >
      {error && (
        <div className="mb-6 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          Couldn&rsquo;t load books: {error.message}. Have you run the M1 migration yet?
        </div>
      )}

      {/* toolbar */}
      <form className="mb-6 flex flex-wrap items-center gap-3" action="/books">
        <div className="relative min-w-0 flex-1">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search title, author or ISBN…"
            className="w-full rounded-xl border border-mist-deep bg-paper py-2.5 pl-10 pr-4 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25"
          />
        </div>
        <Select
          name="category"
          ariaLabel="Filter by category"
          defaultValue={category}
          className="w-48"
          buttonClassName="w-full rounded-xl border bg-paper px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-gold-500/25"
          options={[
            { value: "", label: "All categories" },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
        />
        <button type="submit" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-cream hover:bg-navy-800">
          Search
        </button>
        {filtering && (
          <Link href="/books" className="text-sm font-semibold text-ink-mute hover:text-navy-900">Clear</Link>
        )}
      </form>

      {/* results */}
      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-mist-deep bg-paper p-12 text-center">
          <p className="font-display text-lg font-semibold text-navy-900">
            {filtering ? "No books match your search." : "No books yet."}
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-mute">
            {filtering ? "Try a different search or clear the filters." : "Add your first title, or bulk-import a catalogue from CSV."}
          </p>
          {!filtering && (
            <Link href="/books/new" className="mt-5 inline-block rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-cream hover:bg-navy-800">
              + Add your first book
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="mb-4 font-mono text-xs uppercase tracking-wider text-ink-mute">
            {list.length} {list.length === 1 ? "book" : "books"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((book) => (
              <article key={book.id} className="group flex flex-col overflow-hidden rounded-2xl border border-mist-deep bg-paper transition-shadow hover:shadow-[0_12px_30px_rgba(5,31,66,0.08)]">
                <Link href={`/books/${book.id}`} className="block aspect-[3/4] overflow-hidden bg-mist">
                  {book.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.cover_url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-full items-center justify-center p-4 text-center">
                      <span className="font-display text-sm font-semibold text-ink-mute">{book.title}</span>
                    </div>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  {book.category && (
                    <span className="mb-1.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-gold-700">{book.category}</span>
                  )}
                  <Link href={`/books/${book.id}`} className="font-display text-base font-semibold leading-snug text-navy-900 hover:text-navy-700">
                    {book.title}
                  </Link>
                  <p className="mt-0.5 text-sm text-ink-mute">{book.author ?? "Unknown author"}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-mist pt-3">
                    <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${book.available_copies > 0 ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
                      {book.available_copies}/{book.total_copies} available
                    </span>
                    <div className="flex items-center gap-1">
                      <Link href={`/books/${book.id}/edit`} aria-label={`Edit ${book.title}`} title="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-mute transition-colors hover:bg-mist hover:text-navy-900">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M13.5 6.5l3 3" /></svg>
                      </Link>
                      <DeleteBookButton id={book.id} title={book.title} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
