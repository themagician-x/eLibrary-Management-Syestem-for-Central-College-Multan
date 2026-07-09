"use client";

import { useActionState, useState } from "react";
import { money } from "@/lib/config";
import { useBeforeUnload } from "@/components/unsaved";
import type { Settings } from "@/lib/settings";
import { saveSettings, type SettingsState } from "./actions";

type Key = keyof Settings;

const RULES: {
  name: Key;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
  icon: React.ReactNode;
}[] = [
  {
    name: "loan_days",
    label: "Loan period",
    hint: "Days a book can be borrowed before it's due.",
    min: 1,
    max: 365,
    step: 1,
    suffix: "days",
    icon: <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />,
  },
  {
    name: "max_books",
    label: "Books per student",
    hint: "Maximum books a student may hold at once.",
    min: 1,
    max: 50,
    step: 1,
    suffix: "books",
    icon: <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />,
  },
  {
    name: "max_renews",
    label: "Renewals allowed",
    hint: "How many times a single loan can be renewed.",
    min: 0,
    max: 20,
    step: 1,
    suffix: "times",
    icon: <path d="M21 2v6h-6M3 22v-6h6M3.5 9a9 9 0 0 1 14.9-3.4L21 8M21 15a9 9 0 0 1-14.9 3.4L3 16" />,
  },
  {
    name: "fine_per_day",
    label: "Fine rate",
    hint: "Late fee charged per day a book is overdue.",
    min: 0,
    max: 100000,
    step: 0.5,
    suffix: "Rs/day",
    icon: (
      <>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M5.5 12h.01M18.5 12h.01" />
      </>
    ),
  },
];

const toForm = (s: Settings) => Object.fromEntries(RULES.map((r) => [r.name, String(s[r.name])])) as Record<Key, string>;

export default function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState(saveSettings, {} as SettingsState);
  const [form, setForm] = useState(() => toForm(settings));

  const invalid = RULES.filter((r) => {
    const n = Number(form[r.name]);
    return form[r.name].trim() === "" || !Number.isFinite(n) || n < r.min || n > r.max;
  }).map((r) => r.name);

  // compared numerically, so "10.0" doesn't read as a change from 10
  const dirty = RULES.some((r) => Number(form[r.name]) !== Number(settings[r.name]));
  const canSave = dirty && invalid.length === 0 && !pending;

  useBeforeUnload(dirty);

  const set = (k: Key, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const nudge = (k: Key, by: number) => {
    const r = RULES.find((x) => x.name === k)!;
    const n = Number(form[k]);
    const next = Math.min(r.max, Math.max(r.min, (Number.isFinite(n) ? n : r.min) + by));
    // avoid 0.30000000000000004 from the 0.5 step
    set(k, String(Math.round(next * 100) / 100));
  };

  const num = (k: Key) => (Number.isFinite(Number(form[k])) ? Number(form[k]) : settings[k]);

  return (
    <div className="max-w-3xl">
      {/* live preview of the rules, including edits not yet saved */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900 px-6 py-5 text-cream">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-gold-400">Current rules</p>
        <p className="mt-2 text-sm leading-relaxed">
          A student may hold <Val>{num("max_books")}</Val> {num("max_books") === 1 ? "book" : "books"} at a time,
          each for <Val>{num("loan_days")}</Val> {num("loan_days") === 1 ? "day" : "days"}, renewable{" "}
          <Val>{num("max_renews")}</Val> {num("max_renews") === 1 ? "time" : "times"}. Overdue books are fined{" "}
          <Val>{money(num("fine_per_day"))}</Val> per day.
        </p>
        {dirty && (
          <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-gold-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
            Preview — not saved yet
          </p>
        )}
      </div>

      <form action={formAction} className="mt-6">
        <div className="rounded-2xl border border-mist-deep bg-paper px-6">
          {RULES.map((r) => {
            const bad = invalid.includes(r.name);
            return (
              <div key={r.name} className="grid gap-3 border-b border-mist py-5 last:border-0 sm:grid-cols-[1fr_190px] sm:items-center">
                <div className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-mist text-navy-900">
                    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{r.icon}</svg>
                  </span>
                  <div className="min-w-0">
                    <label htmlFor={r.name} className="block font-semibold text-navy-900">{r.label}</label>
                    <p className="mt-0.5 text-sm text-ink-mute">{r.hint}</p>
                    {bad && (
                      <p className="mt-1 text-xs font-semibold text-danger">
                        Enter a number between {r.min} and {r.max}.
                      </p>
                    )}
                  </div>
                </div>

                <div className={`flex items-center rounded-xl border bg-cream ${bad ? "border-danger" : "border-mist-deep focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-500/25"}`}>
                  <Step label={`Decrease ${r.label}`} onClick={() => nudge(r.name, -r.step)} disabled={num(r.name) <= r.min}>−</Step>
                  <span className="relative flex-1">
                    <input
                      id={r.name}
                      name={r.name}
                      type="number"
                      inputMode="decimal"
                      min={r.min}
                      max={r.max}
                      step={r.step}
                      value={form[r.name]}
                      onChange={(e) => set(r.name, e.target.value)}
                      aria-invalid={bad}
                      className="w-full bg-transparent py-2.5 pr-14 text-center text-sm font-semibold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[0.68rem] font-semibold text-ink-mute">{r.suffix}</span>
                  </span>
                  <Step label={`Increase ${r.label}`} onClick={() => nudge(r.name, r.step)} disabled={num(r.name) >= r.max}>+</Step>
                </div>
              </div>
            );
          })}
        </div>

        {/* action bar — sticks to the bottom so Save is reachable without scrolling */}
        <div className="sticky bottom-4 mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-mist-deep bg-paper/90 px-5 py-4 shadow-[0_6px_24px_rgba(5,31,66,0.08)] backdrop-blur">
          <p className="text-sm font-semibold">
            {state.error ? (
              <span className="text-danger">{state.error}</span>
            ) : dirty ? (
              <span className="flex items-center gap-2 text-navy-900">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
                You have unsaved changes
              </span>
            ) : state.ok ? (
              <span className="text-ok">Saved ✓</span>
            ) : (
              <span className="text-ink-mute">Everything is saved</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setForm(toForm(settings))}
              disabled={!dirty || pending}
              className="rounded-xl border border-mist-deep px-4 py-2.5 text-sm font-bold text-ink-soft transition-colors hover:border-navy-900 hover:text-navy-900 disabled:cursor-default disabled:opacity-40 disabled:hover:border-mist-deep disabled:hover:text-ink-soft"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="rounded-xl bg-navy-900 px-6 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-navy-800 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-navy-900"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>

      <p className="mt-4 text-xs text-ink-mute">
        Changes apply to new issues, returns and renewals immediately. Books already on loan keep the due date they were given.
      </p>
    </div>
  );
}

function Val({ children }: { children: React.ReactNode }) {
  return <span className="font-display text-base font-semibold text-gold-400">{children}</span>;
}

function Step({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-10 w-9 flex-none items-center justify-center text-lg font-bold text-ink-mute transition-colors hover:text-navy-900 disabled:cursor-default disabled:opacity-30 disabled:hover:text-ink-mute"
    >
      {children}
    </button>
  );
}
