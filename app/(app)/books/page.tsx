import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import SearchToolbar from "@/components/SearchToolbar";
import { createClient } from "@/lib/supabase/server";
import { parseSearch, orFilter } from "@/lib/search";
import Pagination, { PAGE_SIZE, pageFrom, rangeFor } from "@/components/Pagination";
import { shelfLabel, type Book } from "@/lib/types";
import BooksTable from "./books-table";

export const metadata: Metadata = { title: "Books" };

/** A uuid no row can have, for a filter that must return nothing. */
const NO_MATCH = "00000000-0000-0000-0000-000000000000";

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; shelf?: string; availability?: string; page?: string }>;
}) {
  const { q = "", category = "", shelf = "", availability = "", page: pageParam } = await searchParams;
  const page = pageFrom(pageParam);
  const supabase = await createClient();

  const search = parseSearch(q);

  // Which titles have copies on the filtered shelf. Resolved as its own query
  // rather than an inner join, because filtering an embedded relation also
  // filters what comes back in it — the row would then show only the copies on
  // that one shelf while the availability beside it still counted them all.
  let onShelf: string[] | null = null;
  if (shelf) {
    const { data } = await supabase
      .from("book_shelves")
      .select("book_id")
      .eq("shelf", shelf);
    onShelf = [...new Set((data ?? []).map((r) => r.book_id as string))];
  }

  let query = supabase
    .from("books")
    .select("*,book_shelves(shelf,copies)", { count: "exact" })
    .order("created_at", { ascending: false });
  const filter = orFilter(search.terms, ["title", "author", "isbn"]);
  if (filter) query = query.or(filter);
  if (category) query = query.eq("category", category);
  // an empty list must match nothing, which `in ()` will not do on its own
  if (onShelf) query = onShelf.length ? query.in("id", onShelf) : query.eq("id", NO_MATCH);
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
  const { data: facetRows } = await supabase.from("books").select("category");
  const categories = [
    ...new Set((facetRows ?? []).map((r) => r.category).filter(Boolean)),
  ].sort() as string[];

  const { data: shelfRows } = await supabase.from("book_shelves").select("shelf");
  const shelves = [...new Set((shelfRows ?? []).map((r) => r.shelf))].sort();

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
              // UNASSIGNED is a sentinel, so it needs reading as prose here too
              ...shelves.map((s) => ({ value: s, label: shelfLabel(s) })),
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
