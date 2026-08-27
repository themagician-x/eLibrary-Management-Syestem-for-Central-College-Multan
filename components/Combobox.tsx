"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Free-text input with a themed suggestion list (navy/gold palette).
 * Unlike <Select>, the typed value need not be one of the suggestions — it's a
 * combobox, so ISBN auto-fill or a brand-new category are both fine. A hidden
 * input keeps it form-submittable when `name` is given.
 *
 * Pass `createLabel` to advertise that: when what's typed matches no suggestion,
 * an extra "create" row appears at the top of the list so the option is
 * discoverable instead of a hidden trick of the input.
 */
export default function Combobox({
  suggestions,
  value,
  onChange,
  name,
  id,
  placeholder,
  createLabel,
  className = "",
  maxRows,
}: {
  suggestions: string[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  /** e.g. "Add" → renders `Add “Poetry” as a new category`. Omit to disable. */
  createLabel?: string;
  className?: string;
  /**
   * Cap the open list to roughly this many rows. Worth setting where the field
   * sits low inside a scrolling panel: a long list is clipped by the panel
   * rather than overflowing it, so a short one stays entirely visible.
   */
  maxRows?: number;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState<"down" | "up">("down");
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  // how tall the open list can get, in px — mirrors the maxHeight applied below
  const listHeight = maxRows ? maxRows * 40 + 12 : 256;

  const typed = value.trim();
  const q = typed.toLowerCase();
  const filtered = q
    ? suggestions.filter((s) => s.toLowerCase().includes(q))
    : suggestions;

  // offer to keep what was typed when it isn't already an option
  const canCreate =
    Boolean(createLabel) && typed.length > 0 && !suggestions.some((s) => s.toLowerCase() === q);

  // the create row, when shown, is the first option — keyboard nav walks both
  const rows: { value: string; create?: boolean }[] = [
    ...(canCreate ? [{ value: typed, create: true }] : []),
    ...filtered.map((s) => ({ value: s })),
  ];

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /**
   * Open upwards when there isn't room below.
   *
   * The field can sit low inside a dialog whose panel clips with
   * `overflow: hidden`, so a list opening downwards is cut off at the panel's
   * edge — and because the panel clips rather than scrolls, nothing reveals the
   * rest. Measuring against every clipping ancestor (not just scrollable ones)
   * is what makes this reliable: `overflow: hidden` crops just as hard as
   * `auto` does.
   */
  useEffect(() => {
    if (!open || !rootRef.current) return;

    const measure = () => {
      const root = rootRef.current;
      if (!root) return;
      const box = root.getBoundingClientRect();

      // tightest bottom/top edge imposed by any ancestor that clips, or the viewport
      let bottomLimit = window.innerHeight;
      let topLimit = 0;
      for (let el = root.parentElement; el; el = el.parentElement) {
        const o = getComputedStyle(el);
        if (/auto|scroll|hidden|clip/.test(o.overflowY + o.overflowX)) {
          const r = el.getBoundingClientRect();
          bottomLimit = Math.min(bottomLimit, r.bottom);
          topLimit = Math.max(topLimit, r.top);
        }
      }

      const below = bottomLimit - box.bottom;
      const above = box.top - topLimit;
      // only flip when down genuinely doesn't fit and up fits better
      setPlacement(below < listHeight + 8 && above > below ? "up" : "down");
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, listHeight]);

  // keep the highlighted option in view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (s: string) => {
    onChange(s);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) { setOpen(true); setActive(0); }
        else setActive((a) => Math.min(a + 1, rows.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) setActive((a) => Math.max(a - 1, 0));
        break;
      case "Enter":
        if (open && rows[active]) { e.preventDefault(); choose(rows[active].value); }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}
      <div className="relative">
        <input
          id={id}
          value={value}
          autoComplete="off"
          onChange={(e) => { onChange(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={placeholder}
          className="w-full rounded-xl border border-mist-deep bg-cream px-4 py-2.5 pr-11 text-sm text-ink outline-none transition-colors placeholder:text-ink-mute/60 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? "Hide suggestions" : "Show suggestions"}
          onClick={() => setOpen((o) => !o)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gold-600 transition-colors hover:bg-mist"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {open && rows.length > 0 && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className={`absolute z-30 w-full overflow-auto rounded-xl border border-mist-deep bg-paper p-1.5 shadow-[0_16px_40px_rgba(5,31,66,0.16)] ${
            placement === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
          style={{ maxHeight: listHeight }}
        >
          {rows.map((row, i) => {
            const opt = row.value;
            const highlighted = active === i;

            if (row.create) {
              return (
                <li
                  key="__create"
                  role="option"
                  aria-selected={false}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(opt)}
                  className={`mb-1 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm transition-colors ${
                    highlighted
                      ? "border-gold-500 bg-navy-900 text-cream"
                      : "border-mist-deep text-gold-700 hover:bg-mist"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="truncate">
                    {createLabel} <span className="font-semibold">&ldquo;{opt}&rdquo;</span>
                  </span>
                </li>
              );
            }

            const selected = opt.toLowerCase() === q;
            return (
              <li
                key={opt}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(opt)}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  highlighted
                    ? "bg-navy-900 text-cream"
                    : selected
                      ? "bg-mist text-navy-900"
                      : "text-ink-soft"
                }`}
              >
                <span className={selected ? "font-semibold" : ""}>{opt}</span>
                {selected && (
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 flex-none ${highlighted ? "text-gold-400" : "text-gold-600"}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
