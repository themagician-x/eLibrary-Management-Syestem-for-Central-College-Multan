import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import Select from "@/components/Select";
import { createClient } from "@/lib/supabase/server";
import type { Book } from "@/lib/types";
import BooksTable from "./books-table";

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
          <BooksTable books={list} />
        </>
      )}
    </PageShell>
  );
}
