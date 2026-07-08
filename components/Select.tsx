"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

/**
 * Accessible dropdown styled in the eLibrary navy/gold palette.
 * Native <select> popups are drawn by the OS and can't be themed, so we render
 * our own listbox. A hidden input keeps the value form-submittable when `name`
 * is given; pass `value` + `onChange` to drive it as a controlled input.
 */
export default function Select({
  options,
  name,
  value: controlledValue,
  defaultValue,
  onChange,
  id,
  ariaLabel,
  className = "",
  buttonClassName,
}: {
  options: SelectOption[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  id?: string;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
}) {
  const isControlled = controlledValue !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? options[0]?.value ?? "");
  const value = isControlled ? controlledValue : internal;

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : "";

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selectedIndex >= 0 ? selectedIndex : 0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

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

  const choose = (i: number) => {
    const v = options[i].value;
    if (!isControlled) setInternal(v);
    onChange?.(v);
    setActive(i);
    setOpen(false);
  };

  const toggle = () =>
    setOpen((o) => {
      if (!o) setActive(selectedIndex >= 0 ? selectedIndex : 0);
      return !o;
    });

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) toggle();
        else setActive((a) => Math.min(a + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) setActive((a) => Math.max(a - 1, 0));
        break;
      case "Home":
        if (open) { e.preventDefault(); setActive(0); }
        break;
      case "End":
        if (open) { e.preventDefault(); setActive(options.length - 1); }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) choose(active);
        else toggle();
        break;
      case "Escape":
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const trigger =
    buttonClassName ??
    "w-full rounded-xl border bg-cream px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-gold-500/25";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={toggle}
        onKeyDown={onKeyDown}
        className={`flex items-center justify-between gap-3 text-left ${trigger} ${
          open ? "border-gold-500 ring-2 ring-gold-500/25" : "border-mist-deep"
        } ${selectedLabel ? "text-ink" : "text-ink-mute/70"}`}
      >
        <span className="truncate">{selectedLabel || "Choose…"}</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 flex-none text-gold-600 transition-transform ${open ? "rotate-180" : ""}`}
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

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          className="absolute z-30 mt-2 max-h-64 w-full min-w-max overflow-auto rounded-xl border border-mist-deep bg-paper p-1.5 shadow-[0_16px_40px_rgba(5,31,66,0.18)]"
        >
          {options.map((opt, i) => {
            const selected = value === opt.value;
            const highlighted = active === i;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  highlighted
                    ? "bg-navy-900 text-cream"
                    : selected
                      ? "bg-mist text-navy-900"
                      : "text-ink-soft"
                }`}
              >
                <span className={selected ? "font-semibold" : ""}>{opt.label}</span>
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
