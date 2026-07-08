"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Free-text input with a themed suggestion list (navy/gold palette).
 * Unlike <Select>, the typed value need not be one of the suggestions — it's a
 * combobox, so ISBN auto-fill or a brand-new category are both fine. A hidden
 * input keeps it form-submittable when `name` is given.
 */
export default function Combobox({
  suggestions,
  value,
  onChange,
  name,
  id,
  placeholder,
  className = "",
}: {
  suggestions: string[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const q = value.trim().toLowerCase();
  const filtered = q
    ? suggestions.filter((s) => s.toLowerCase().includes(q))
    : suggestions;

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

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
        else setActive((a) => Math.min(a + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) setActive((a) => Math.max(a - 1, 0));
        break;
      case "Enter":
        if (open && filtered[active]) { e.preventDefault(); choose(filtered[active]); }
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

      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-mist-deep bg-paper p-1.5 shadow-[0_16px_40px_rgba(5,31,66,0.16)]"
        >
          {filtered.map((opt, i) => {
            const selected = opt.toLowerCase() === q;
            const highlighted = active === i;
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
