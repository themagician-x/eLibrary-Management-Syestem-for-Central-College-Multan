"use client";

import { useActionState } from "react";
import type { Settings } from "@/lib/settings";
import { saveSettings, type SettingsState } from "./actions";

const field = "w-full rounded-xl border border-mist-deep bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25";

function Row({
  name,
  label,
  hint,
  value,
  min,
  max,
  step,
  suffix,
}: {
  name: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step?: string;
  suffix?: string;
}) {
  return (
    <div className="grid gap-3 border-b border-mist py-5 last:border-0 sm:grid-cols-[1fr_150px] sm:items-center">
      <div>
        <label htmlFor={name} className="block font-semibold text-navy-900">{label}</label>
        <p className="mt-0.5 text-sm text-ink-mute">{hint}</p>
      </div>
      <div className="relative">
        <input id={name} name={name} type="number" min={min} max={max} step={step} defaultValue={value} className={`${field} ${suffix ? "pr-12" : ""} tabular-nums`} />
        {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-mute">{suffix}</span>}
      </div>
    </div>
  );
}

export default function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState(saveSettings, {} as SettingsState);

  return (
    <form action={formAction} className="max-w-2xl">
      <div className="rounded-2xl border border-mist-deep bg-paper px-6">
        <Row name="loan_days" label="Loan period" hint="Days a book can be borrowed before it's due." value={settings.loan_days} min={1} max={365} suffix="days" />
        <Row name="max_books" label="Books per student" hint="Maximum books a student may hold at once." value={settings.max_books} min={1} max={50} suffix="books" />
        <Row name="max_renews" label="Renewals allowed" hint="How many times a loan can be renewed." value={settings.max_renews} min={0} max={20} suffix="times" />
        <Row name="fine_per_day" label="Fine rate" hint="Late fee charged per day a book is overdue." value={settings.fine_per_day} min={0} max={100000} step="0.5" suffix="Rs/day" />
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button type="submit" disabled={pending} className="rounded-xl bg-navy-900 px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-navy-800 disabled:opacity-60">
          {pending ? "Saving…" : "Save changes"}
        </button>
        {state.ok && <span className="text-sm font-semibold text-ok">Saved ✓</span>}
        {state.error && <span className="text-sm text-danger">{state.error}</span>}
      </div>
      <p className="mt-4 text-xs text-ink-mute">
        Changes apply to new issues, returns and renewals immediately.
      </p>
    </form>
  );
}
