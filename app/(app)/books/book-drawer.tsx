"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Book } from "@/lib/types";
import DeleteButton from "@/components/DeleteButton";
import BookLabel from "@/components/BookLabel";
import { deleteBook } from "./actions";

export default function BookDrawer({
  book,
  onClose,
}: {
  book: Book | null;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState<Book | null>(null);
  const [shown, setShown] = useState(false);
  const [reserved, setReserved] = useState<number | null>(null);

  // mount / slide transition (keep `current` while animating out)
  useEffect(() => {
    if (book) {
      setCurrent(book);
      const r = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(r);
    }
    setShown(false);
    const t = setTimeout(() => setCurrent(null), 300);
    return () => clearTimeout(t);
  }, [book]);

  // fetch reservation count for the opened book
  useEffect(() => {
    if (!book) return;
    let alive = true;
    setReserved(null);
    const supabase = createClient();
    supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("book_id", book.id)
      .in("status", ["waiting", "ready"])
      .then(({ count }) => alive && setReserved(count ?? 0));
    return () => {
      alive = false;
    };
  }, [book]);

  // esc to close (background scroll is left untouched so the sticky sidebar
  // doesn't jump; the drawer contains its own scroll instead)
  useEffect(() => {
    if (!book) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [book, onClose]);

  if (!current) return null;
  const b = current;

  const meta: [string, string | number | null][] = [
    ["ISBN", b.isbn],
    ["Publisher", b.publisher],
    ["Year", b.published_year],
    ["Category", b.category],
    ["Language", b.language],
    ["Shelf", b.shelf],
  ];

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={b.title}>
      {/* overlay */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-navy-950/40 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
      />

      {/* panel */}
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream shadow-[0_0_60px_rgba(5,31,66,0.35)] transition-transform duration-300 ${shown ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-mist-deep px-6 py-5">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold leading-snug text-navy-900">{b.title}</h2>
            <p className="truncate text-sm text-ink-mute">{b.author ?? "Unknown author"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-ink-mute transition-colors hover:bg-mist hover:text-navy-900"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* body */}
        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-5">
          {/* cover */}
          <div>
            <div className="mx-auto aspect-[3/4] w-52 max-w-full overflow-hidden rounded-2xl border border-mist-deep bg-mist shadow-[0_12px_32px_rgba(5,31,66,0.16)]">
              {b.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.cover_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center p-4 text-center">
                  <span className="font-display text-sm font-semibold text-ink-mute">{b.title}</span>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${b.available_copies > 0 ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
                {b.available_copies} of {b.total_copies} available
              </span>
              {reserved ? (
                <Link href="/reservations" onClick={onClose} className="inline-block rounded-full bg-gold-100 px-3 py-1 text-xs font-bold text-gold-700 hover:bg-gold-400/40">
                  {reserved} in queue
                </Link>
              ) : null}
            </div>
          </div>

          {/* metadata */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            {meta.map(([k, val]) => (
              <div key={k} className="border-b border-mist pb-3">
                <dt className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">{k}</dt>
                <dd className="mt-1 text-sm font-semibold text-navy-900">{val || <span className="font-normal text-ink-mute/60">—</span>}</dd>
              </div>
            ))}
          </dl>

          {/* description */}
          {b.description && (
            <div>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">Description</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{b.description}</p>
            </div>
          )}

          {/* barcode label */}
          <BookLabel value={b.barcode ?? ""} title={b.title} shelf={b.shelf} />
        </div>

        {/* footer actions */}
        <div className="flex items-center gap-2 border-t border-mist-deep px-6 py-4">
          <Link
            href={`/books/${b.id}/edit`}
            onClick={onClose}
            className="flex-1 rounded-xl bg-navy-900 px-4 py-2.5 text-center text-sm font-bold text-cream transition-colors hover:bg-navy-800"
          >
            Edit book
          </Link>
          <DeleteButton onDelete={() => deleteBook(b.id)} name={`“${b.title}”`} title="Delete book" onDeleted={onClose} />
        </div>
      </div>
    </div>
  );
}
