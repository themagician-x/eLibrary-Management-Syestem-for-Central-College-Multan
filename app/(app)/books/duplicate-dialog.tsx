"use client";

import { useEffect, useRef, useState } from "react";
import { shelfLabel } from "@/lib/types";
import type { DuplicateBook } from "./actions";

const field =
  "w-full rounded-xl border border-mist-deep bg-cream px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-mute/60 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25";

/**
 * Shown when the details being entered match a title already catalogued.
 *
 * The useful action is almost never "make a second record" — it is "these are
 * more copies of the book we already have, put them on a shelf". So that is the
 * primary button, and it writes shelf rows rather than a book row. Creating a
 * separate record stays available, because two editions can legitimately share
 * a title, but it is deliberately the quiet option.
 */
export default function DuplicateDialog({
  duplicate,
  shelf,
  copies,
  onPlace,
  onEdit,
  onAddAnyway,
  pending,
  error,
}: {
  duplicate: DuplicateBook;
  /** The shelf and quantity the librarian just typed into the form. */
  shelf: string;
  copies: number;
  onPlace: (shelf: string, copies: number) => void;
  onEdit: () => void;
  onAddAnyway: () => void;
  pending?: boolean;
  error?: string | null;
}) {
  // Where the copies should go by default. If the librarian named a shelf on
  // the form, that wins. If they left it blank, the answer is almost never
  // "nowhere" — it is the shelf this title already lives on, so offer the one
  // holding the most copies rather than quietly filing them as unplaced.
  const [placeShelf, setPlaceShelf] = useState(() => {
    if (shelf.trim()) return shelf;
    const placed = duplicate.shelves
      .filter((s) => s.shelf !== "UNASSIGNED")
      .sort((a, b) => b.copies - a.copies || a.shelf.localeCompare(b.shelf));
    return placed[0]?.shelf ?? "";
  });
  const [placeCopies, setPlaceCopies] = useState(String(Math.max(1, copies)));
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const n = parseInt(placeCopies, 10);
  const valid = Number.isFinite(n) && n > 0;

  const target = placeShelf.trim().toUpperCase();
  const existing = duplicate.shelves.find((s) => s.shelf === (target || "UNASSIGNED"));

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-navy-950/50 px-4 py-10 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dup-title"
        className="w-full max-w-lg rounded-2xl border border-mist-deep bg-cream p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gold-500/15 text-gold-600">
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2
              id="dup-title"
              ref={headingRef}
              tabIndex={-1}
              className="font-display text-lg font-bold text-navy-900 outline-none"
            >
              {duplicate.certain ? "This book is already in the system" : "This looks like a book you already have"}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {duplicate.certain
                ? "That ISBN is already catalogued, so this is the same edition."
                : "The title and author match an existing record. Different editions can share both, so this is your call."}
            </p>
          </div>
        </div>

        {/* what is already on the shelves */}
        <div className="rounded-xl border border-mist-deep bg-mist/50 p-4">
          <p className="font-display font-bold text-navy-900">{duplicate.title}</p>
          {duplicate.author && <p className="text-sm text-ink-soft">{duplicate.author}</p>}
          <p className="mt-2 text-xs text-ink-mute">
            {duplicate.total_copies} {duplicate.total_copies === 1 ? "copy" : "copies"} in the catalogue
            {duplicate.isbn && <> · ISBN {duplicate.isbn}</>}
          </p>
          <ul className="mt-3 space-y-1">
            {duplicate.shelves.length === 0 && (
              <li className="text-sm text-ink-mute">No copies placed on a shelf yet.</li>
            )}
            {[...duplicate.shelves]
              .sort((a, b) => b.copies - a.copies || a.shelf.localeCompare(b.shelf))
              .map((s) => (
                <li key={s.shelf} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-mono text-ink">{shelfLabel(s.shelf)}</span>
                  <span className="text-ink-soft">
                    {s.copies} {s.copies === 1 ? "copy" : "copies"}
                  </span>
                </li>
              ))}
          </ul>
        </div>

        {/* place the new copies */}
        <div className="mt-4 grid grid-cols-[1fr_6rem] gap-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-soft" htmlFor="dup-shelf">
              Put the new copies on
            </label>
            <input
              id="dup-shelf"
              value={placeShelf}
              onChange={(e) => setPlaceShelf(e.target.value)}
              placeholder="Shelf — e.g. CS-B2"
              className={field}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-soft" htmlFor="dup-copies">
              Copies
            </label>
            <input
              id="dup-copies"
              type="number"
              min="1"
              value={placeCopies}
              onChange={(e) => setPlaceCopies(e.target.value)}
              className={field}
            />
          </div>
        </div>

        <p className="mt-2 text-xs text-ink-mute">
          {existing
            ? `${shelfLabel(existing.shelf)} already holds ${existing.copies}; this would make it ${existing.copies + (valid ? n : 0)}.`
            : "This adds a new shelf entry for the book — no second record is created."}
          {" "}The existing book&rsquo;s other details are kept as they are.
        </p>

        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist"
          >
            Cancel
          </button>
          {!duplicate.certain && (
            <button
              type="button"
              onClick={onAddAnyway}
              disabled={pending}
              className="rounded-xl border border-mist-deep px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist disabled:opacity-60"
            >
              Add as a separate book
            </button>
          )}
          <button
            type="button"
            onClick={() => onPlace(placeShelf, n)}
            disabled={pending || !valid}
            className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending
              ? "Saving…"
              : `Add ${valid ? n : ""} ${valid && n === 1 ? "copy" : "copies"} to ${
                  placeShelf.trim() ? placeShelf.trim().toUpperCase() : "Unassigned"
                }`}
          </button>
        </div>
      </div>
    </div>
  );
}
