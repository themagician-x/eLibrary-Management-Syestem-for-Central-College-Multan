"use client";

import { useState } from "react";
import Combobox from "@/components/Combobox";
import { UNASSIGNED_SHELF, type BookShelf } from "@/lib/types";

const micro =
  "text-[0.62rem] font-bold uppercase tracking-[0.1em] text-ink-mute";

// deliberately without w-full: these sit in a grid track that sets the width,
// and Tailwind emits w-full after w-24, so including it here would win the
// cascade and stretch the field past its column
const copiesField =
  "rounded-xl border border-mist-deep bg-cream px-3 py-2.5 text-center text-sm tabular-nums text-ink outline-none transition-colors focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25 " +
  // the spin buttons add nothing at this size and crowd a two-digit number
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

type Row = { key: string; shelf: string; copies: string };

function toRows(shelves: BookShelf[] | null | undefined): Row[] {
  if (!shelves?.length) {
    return [{ key: crypto.randomUUID(), shelf: "", copies: "1" }];
  }
  return [...shelves]
    .sort((a, b) => b.copies - a.copies || a.shelf.localeCompare(b.shelf))
    .map((s) => ({
      key: crypto.randomUUID(),
      // the sentinel is a database value, not somewhere in the building
      shelf: s.shelf === UNASSIGNED_SHELF ? "" : s.shelf,
      copies: String(s.copies),
    }));
}

/**
 * Where this title's copies sit. A book may be split across racks — twelve on
 * CS-A1, eight on CS-B2 — so this is a list rather than a single field, and
 * the total is the sum of it rather than a number typed separately. The
 * database derives books.total_copies the same way, so the two cannot disagree.
 *
 * Submits as one hidden JSON field; a shelf left blank is recorded as
 * unassigned, which is how copies that have arrived but not been placed are held.
 */
export default function ShelfRows({
  shelves,
  suggestions = [],
  onChange,
}: {
  shelves?: BookShelf[] | null;
  /** Shelf codes already used in the catalogue. */
  suggestions?: string[];
  onChange?: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => toRows(shelves));

  const touch = (next: Row[]) => {
    setRows(next);
    // the combobox writes through a callback, firing no native form event
    if (onChange) setTimeout(onChange, 0);
  };

  const patch = (i: number, part: Partial<Row>) => {
    const next = [...rows];
    next[i] = { ...next[i], ...part };
    touch(next);
  };

  const total = rows.reduce((sum, r) => {
    const n = parseInt(r.copies, 10);
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);

  const payload = JSON.stringify(
    rows
      .map((r) => ({ shelf: r.shelf, copies: parseInt(r.copies, 10) }))
      .filter((r) => Number.isFinite(r.copies) && r.copies > 0)
  );

  // one grid so the shelf, the count and the remove button line up down the
  // column no matter how many rows there are
  const grid = "grid grid-cols-[minmax(0,1fr)_5rem_2rem] items-center gap-2";

  return (
    <div>
      <input type="hidden" name="shelves" value={payload} />

      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">
          Shelves &amp; copies
        </span>
        <span className="text-xs tabular-nums text-ink-soft">
          {total} {total === 1 ? "copy" : "copies"} in total
        </span>
      </div>

      <div className={`${grid} mb-1`}>
        <span className={micro}>Shelf</span>
        <span className={`${micro} text-center`}>Copies</span>
        <span />
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={row.key} className={grid}>
            <Combobox
              id={i === 0 ? "shelf" : undefined}
              value={row.shelf}
              onChange={(v) => patch(i, { shelf: v })}
              suggestions={suggestions}
              createLabel="Use"
              placeholder="Pick a shelf or type a new one"
              // this row sits low in a scrolling dialog, so a long list would be
              // clipped by the panel; four rows stay visible and the rest scroll
              maxRows={4}
            />
            <input
              aria-label={`Copies on shelf ${i + 1}`}
              type="number"
              inputMode="numeric"
              min="1"
              value={row.copies}
              onChange={(e) => patch(i, { copies: e.target.value })}
              className={copiesField}
            />
            {rows.length > 1 ? (
              <button
                type="button"
                aria-label={`Remove shelf ${i + 1}`}
                onClick={() => touch(rows.filter((r) => r.key !== row.key))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-mute transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                </svg>
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={() =>
            touch([...rows, { key: crypto.randomUUID(), shelf: "", copies: "1" }])
          }
          className="text-xs font-bold text-navy-900 transition-colors hover:text-gold-600"
        >
          + Add another shelf
        </button>
        <span className="text-xs text-ink-mute">
          Leave a shelf blank for copies not yet placed.
        </span>
      </div>
    </div>
  );
}
