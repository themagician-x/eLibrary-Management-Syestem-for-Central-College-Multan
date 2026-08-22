import type { Book } from "@/lib/types";

const day = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Every field the admin fills in on the book form, in one place so the drawer
 * and the full detail page can't drift apart. Blank fields show a dash instead
 * of disappearing, so it's clear the value was left empty rather than missing.
 */
export default function BookFacts({
  book,
  className = "",
}: {
  book: Book;
  className?: string;
}) {
  const facts: [string, string | number | null][] = [
    ["Author", book.author],
    ["ISBN", book.isbn],
    ["Publisher", book.publisher],
    ["Year", book.published_year],
    ["Category", book.category],
    ["Language", book.language],
    ["Shelf", book.shelf],
    ["Copies", book.total_copies],
    ["Barcode", book.barcode],
    ["Added", day(book.created_at)],
  ];

  return (
    <div className={className}>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {facts.map(([k, v]) => (
          <div key={k} className="border-b border-mist pb-3">
            <dt className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">{k}</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-navy-900">
              {v === null || v === "" ? <span className="font-normal text-ink-mute/60">—</span> : v}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">Description</p>
        <p className="mt-2 max-w-prose whitespace-pre-line text-sm leading-relaxed text-ink-soft">
          {book.description || <span className="text-ink-mute/60">No description was added for this book.</span>}
        </p>
      </div>
    </div>
  );
}
