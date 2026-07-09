"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Select, { type SelectOption } from "@/components/Select";

type Filter = {
  name: string;
  value: string;
  ariaLabel: string;
  options: SelectOption[];
  width?: string;
};

/**
 * Live search toolbar — updates the URL query as the user types (debounced),
 * so the server-rendered list filters without a Search button. An optional
 * Select filter applies immediately on change.
 */
export default function SearchToolbar({
  basePath,
  q,
  placeholder,
  filter,
}: {
  basePath: string;
  q: string;
  placeholder: string;
  filter?: Filter;
}) {
  const router = useRouter();
  const [text, setText] = useState(q);
  const [filterValue, setFilterValue] = useState(filter?.value ?? "");
  const [pending, start] = useTransition();
  const skipFirst = useRef(true);

  function push(nextText: string, nextFilter: string) {
    const params = new URLSearchParams();
    if (nextText.trim()) params.set("q", nextText.trim());
    if (filter && nextFilter) params.set(filter.name, nextFilter);
    const qs = params.toString();
    start(() => router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false }));
  }

  // debounce typing
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    const h = setTimeout(() => push(text, filterValue), 250);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const active = Boolean(text.trim() || filterValue);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="relative min-w-0 flex-1">
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full rounded-xl border border-mist-deep bg-paper py-2.5 pl-10 pr-9 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25"
        />
        {pending && (
          <span className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-mist-deep border-t-gold-500" aria-hidden="true" />
        )}
      </div>

      {filter && (
        <Select
          name={filter.name}
          ariaLabel={filter.ariaLabel}
          value={filterValue}
          onChange={(v) => {
            setFilterValue(v);
            push(text, v);
          }}
          className={filter.width ?? "w-48"}
          buttonClassName="w-full rounded-xl border bg-paper px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-gold-500/25"
          options={filter.options}
        />
      )}

      {active && (
        <button
          type="button"
          onClick={() => {
            setText("");
            setFilterValue("");
            push("", "");
          }}
          className="text-sm font-semibold text-ink-mute transition-colors hover:text-navy-900"
        >
          Clear
        </button>
      )}
    </div>
  );
}
