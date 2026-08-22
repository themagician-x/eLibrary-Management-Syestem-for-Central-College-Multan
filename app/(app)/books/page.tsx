import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import SearchToolbar from "@/components/SearchToolbar";
import { createClient } from "@/lib/supabase/server";
import { parseSearch, orFilter } from "@/lib/search";
import Pagination, { PAGE_SIZE, pageFrom, rangeFor } from "@/components/Pagination";
import type { Book } from "@/lib/types";
import BooksTable from "./books-table";

export const metadata: Metadata = { title: "Books" };

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; shelf?: string; availability?: string; page?: string }>;
}) {
  const { q = "", category = "", shelf = "", availability = "", page: pageParam } = await searchParams;
  const page = pageFrom(pageParam);
  const supabase = await createClient();

  const search = parseSearch(q);

  let query = supabase
    .from("books")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  const filter = orFilter(search.terms, ["title", "author", "isbn"]);
  if (filter) query = query.or(filter);
  if (category) query = query.eq("category", category);
  if (shelf) query = query.eq("shelf", shelf);
  if (availability === "available") query = query.gt("available_copies", 0);
  else if (availability === "out") query = query.eq("available_copies", 0);

  const [from, to] = rangeFor(page);

  // too many terms: show the message rather than a misleading empty result
  const { data: books, error, count } = search.error
    ? { data: [], error: null, count: 0 }
    : await query.range(from, to);

  const total = count ?? 0;

  // distinct categories and shelves for the filters — read from the whole
  // catalogue, not the filtered page, so the options don't vanish as you narrow
  const { data: facetRows } = await supabase.from("books").select("category,shelf");
  const uniq = (key: "category" | "shelf") =>
    [...new Set((facetRows ?? []).map((r) => r[key]).filter(Boolean))].sort() as string[];
  const categories = uniq("category");
  const shelves = uniq("shelf");

  const list = (books ?? []) as Book[];
  const filtering = Boolean(q || category || shelf || availability);

  return (
    <PageShell
      title="Books"
      subtitle="The library catalogue."
      fill
      badge={`${total.toLocaleString()} ${total === 1 ? "book" : "books"}`}
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
      {search.error && (
        <div role="alert" className="mb-4 rounded-xl border border-warn/25 bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
          {search.error}
        </div>
      )}

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          Couldn&rsquo;t load books: {error.message}
        </div>
      )}

      {/* toolbar */}
      <SearchToolbar
        basePath="/books"
        q={q}
        placeholder="Search title, author or ISBN — commas for up to 5…"
        filters={[
          {
            name: "category",
            value: category,
            ariaLabel: "Filter by category",
            options: [
              { value: "", label: "All categories" },
              ...categories.map((c) => ({ value: c, label: c })),
            ],
          },
          {
            name: "shelf",
            value: shelf,
            ariaLabel: "Filter by shelf",
            width: "w-40",
            options: [
              { value: "", label: "All shelves" },
              ...shelves.map((s) => ({ value: s, label: s })),
            ],
          },
          {
            name: "availability",
            value: availability,
            ariaLabel: "Filter by availability",
            width: "w-44",
            options: [
              { value: "", label: "Any availability" },
              { value: "available", label: "Available" },
              { value: "out", label: "All copies out" },
            ],
          },
        ]}
      />

      {/* results */}
      {total === 0 ? (
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
          <Pagination
            page={page}
            total={total}
            basePath="/books"
            params={{ q, category, shelf, availability }}
            noun="book"
          />
        </>
      )}
    </PageShell>
  );
}
