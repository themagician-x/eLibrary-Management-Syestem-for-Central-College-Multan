"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Two-month range calendar in the app's palette.
 *
 * Dates are handled as plain yyyy-mm-dd strings throughout. A range picked in
 * Multan must not shift because the browser sits in another zone, and the only
 * way to guarantee that is never to build a Date from the selection — the
 * server turns these calendar days into instants in the library's timezone.
 */

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** yyyy-mm-dd for a calendar day, without going through a Date. */
const key = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Monday-first index of the 1st, matching the en-GB week the app formats in. */
const firstWeekday = (y: number, m: number) => (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;

function addMonths(y: number, m: number, n: number): [number, number] {
  const total = y * 12 + m + n;
  return [Math.floor(total / 12), ((total % 12) + 12) % 12];
}

function Month({
  year,
  month,
  start,
  end,
  hover,
  max,
  onPick,
  onHover,
}: {
  year: number;
  month: number;
  start: string | null;
  end: string | null;
  hover: string | null;
  max: string;
  onPick: (day: string) => void;
  onHover: (day: string | null) => void;
}) {
  const pad = firstWeekday(year, month);
  const total = daysInMonth(year, month);

  // while choosing the end, preview the range the cursor is over
  const provisionalEnd = end ?? (start && hover && hover > start ? hover : null);

  return (
    <div className="min-w-0">
      <p className="mb-2 text-center font-display text-sm font-semibold text-navy-900">
        {MONTHS[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-y-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-1 text-center font-mono text-[0.55rem] uppercase tracking-[0.08em] text-ink-mute">
            {w}
          </span>
        ))}
        {Array.from({ length: pad }, (_, i) => <span key={`pad${i}`} />)}
        {Array.from({ length: total }, (_, i) => {
          const day = key(year, month, i + 1);
          const disabled = day > max;
          const isStart = day === start;
          const isEnd = day === provisionalEnd;
          const inRange =
            start !== null &&
            provisionalEnd !== null &&
            day > start &&
            day < provisionalEnd;
          const edge = isStart || isEnd;

          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              aria-label={day}
              aria-pressed={edge}
              onClick={() => onPick(day)}
              onMouseEnter={() => onHover(day)}
              className={[
                "relative mx-auto flex h-8 w-8 items-center justify-center text-xs tabular-nums transition-colors",
                edge
                  ? "rounded-lg bg-navy-900 font-bold text-cream"
                  : inRange
                    ? "bg-navy-900/10 font-semibold text-navy-900"
                    : disabled
                      ? "cursor-not-allowed text-ink-mute/35"
                      : "rounded-lg text-ink-soft hover:bg-mist hover:text-navy-900",
                // square off the inner edges so a selected range reads as one bar
                inRange ? "w-full rounded-none" : "",
                isStart && provisionalEnd && provisionalEnd !== start ? "rounded-r-none" : "",
                isEnd && start && start !== provisionalEnd ? "rounded-l-none" : "",
              ].join(" ")}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangeCalendar({
  from,
  to,
  max,
  onApply,
  onCancel,
}: {
  /** yyyy-mm-dd, or "" for nothing chosen yet. */
  from: string;
  to: string;
  /** Latest selectable day, yyyy-mm-dd — reports about the future say nothing. */
  max: string;
  onApply: (from: string, to: string) => void;
  onCancel: () => void;
}) {
  const [start, setStart] = useState<string | null>(from || null);
  const [end, setEnd] = useState<string | null>(to || null);
  const [hover, setHover] = useState<string | null>(null);
  const [align, setAlign] = useState<"left" | "right">("left");
  const rootRef = useRef<HTMLDivElement>(null);

  // Anchor to whichever edge of the trigger leaves the calendar on screen. The
  // control sits at the left of the content column on some pages and at the
  // right of the title row on others, and a fixed side falls off in one of them.
  useEffect(() => {
    const el = rootRef.current;
    const trigger = el?.parentElement;
    if (!el || !trigger) return;
    const box = trigger.getBoundingClientRect();
    setAlign(window.innerWidth - box.left - 8 >= el.offsetWidth ? "left" : "right");
  }, []);

  // open on the months the current range sits in, so it is visible immediately
  const [[vy, vm], setView] = useState<[number, number]>(() => {
    const anchor = from || to || max;
    const [y, m] = anchor.split("-").map(Number);
    return addMonths(y, m - 1, -1);
  });
  const [ny, nm] = addMonths(vy, vm, 1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // the next month must not run past the latest selectable day
  const atMax = useMemo(() => {
    const [my, mmo] = max.split("-").map(Number);
    return ny > my || (ny === my && nm >= mmo - 1);
  }, [ny, nm, max]);

  function pick(day: string) {
    // first click sets the start; the next one closes the range, unless it is
    // earlier — in which case the librarian is starting again from there
    if (!start || end || day < start) {
      setStart(day);
      setEnd(null);
    } else {
      setEnd(day);
    }
  }

  const ready = Boolean(start && end);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="false"
      aria-label="Choose a date range"
      className={`absolute z-40 mt-2 w-[min(38rem,calc(100vw-2rem))] rounded-2xl border border-mist-deep bg-paper p-4 shadow-[0_24px_60px_rgba(5,31,66,0.22)] ${
        align === "left" ? "left-0" : "right-0"
      }`}
      onMouseLeave={() => setHover(null)}
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setView(addMonths(vy, vm, -1))}
          className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-mist hover:text-navy-900"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ink-mute">
          {start ? (end ? `${start} → ${end}` : "Now pick the end date") : "Pick the start date"}
        </p>
        <button
          type="button"
          aria-label="Next month"
          disabled={atMax}
          onClick={() => setView(addMonths(vy, vm, 1))}
          className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-mist hover:text-navy-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>

      {/* Two months side by side once there is room. On a phone only the later
          of the pair shows — that is the month the range is anchored to, so it
          opens on something useful instead of asking for a tap to get there. */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="hidden sm:block">
          <Month year={vy} month={vm} start={start} end={end} hover={hover} max={max} onPick={pick} onHover={setHover} />
        </div>
        <Month year={ny} month={nm} start={start} end={end} hover={hover} max={max} onPick={pick} onHover={setHover} />
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 border-t border-mist pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => start && end && onApply(start, end)}
          className="rounded-xl bg-navy-900 px-5 py-2 text-sm font-bold text-cream transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Apply range
        </button>
      </div>
    </div>
  );
}
