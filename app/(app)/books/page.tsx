import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import SearchToolbar from "@/components/SearchToolbar";
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
      badge={`${list.length} ${list.length === 1 ? "book" : "books"}`}
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
      <SearchToolbar
        basePath="/books"
        q={q}
        placeholder="Search title, author or ISBN…"
        filter={{
          name: "category",
          value: category,
          ariaLabel: "Filter by category",
          options: [
            { value: "", label: "All categories" },
            ...categories.map((c) => ({ value: c, label: c })),
          ],
        }}
      />

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
          <BooksTable books={list} />
        </>
      )}
    </PageShell>
  );
}
