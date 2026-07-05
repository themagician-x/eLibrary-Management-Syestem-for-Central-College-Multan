"use client";

import { useEffect, useRef, useState } from "react";

export type PickOption = {
  id: string;
  label: string;
  sub?: string;
  disabled?: boolean;
};

export default function AsyncPicker({
  placeholder,
  search,
  onPick,
  selected,
  onClear,
}: {
  placeholder: string;
  search: (term: string) => Promise<PickOption[]>;
  onPick: (opt: PickOption) => void;
  selected: PickOption | null;
  onClear: () => void;
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<PickOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const latest = useRef(0);

  useEffect(() => {
    if (selected) return;
    const t = term.trim();
    if (!t) { setResults([]); return; }
    const id = ++latest.current;
    setLoading(true);
    const h = setTimeout(async () => {
      const r = await search(t);
      if (id === latest.current) { setResults(r); setOpen(true); setLoading(false); }
    }, 180);
    return () => clearTimeout(h);
  }, [term, search, selected]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function pick(opt: PickOption) {
    if (opt.disabled) return;
    onPick(opt);
    setOpen(false);
    setTerm("");
    setResults([]);
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-navy-600 bg-navy-100/40 px-4 py-2.5">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-navy-900">{selected.label}</span>
          {selected.sub && <span className="block truncate text-xs text-ink-mute">{selected.sub}</span>}
        </span>
        <button type="button" onClick={onClear} className="flex-none rounded-lg px-2 py-1 text-xs font-semibold text-ink-mute hover:bg-mist hover:text-danger">
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const usable = results.filter((r) => !r.disabled);
            if (usable.length === 1) pick(usable[0]); // scan → single exact match
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-xl border border-mist-deep bg-cream px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-mute/60 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25"
      />
      {open && (results.length > 0 || loading) && (
        <ul className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-mist-deep bg-paper p-1.5 shadow-[0_16px_40px_rgba(5,31,66,0.16)]">
          {loading && results.length === 0 && <li className="px-3 py-2 text-sm text-ink-mute">Searching…</li>}
          {results.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                disabled={opt.disabled}
                onClick={() => pick(opt)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors enabled:hover:bg-mist disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-navy-900">{opt.label}</span>
                  {opt.sub && <span className="block truncate text-xs text-ink-mute">{opt.sub}</span>}
                </span>
                {opt.disabled && <span className="flex-none text-[0.6rem] font-bold uppercase text-danger">unavailable</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
