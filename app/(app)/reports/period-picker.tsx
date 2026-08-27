"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Select from "@/components/Select";
import DateRangeCalendar from "@/components/DateRangeCalendar";
import { PRESETS, type Period } from "@/lib/period";

/**
 * Chooses the reporting period. State lives in the query string rather than in
 * the component, so a period survives a reload, can be sent to someone as a
 * link, and is read on the server where the figures are actually counted.
 *
 * "Custom range" is not a value the select settles on — picking it opens the
 * calendar, and the range that comes back is what the control then shows.
 */
export default function PeriodPicker({
  period,
  today,
}: {
  period: Period;
  /** Latest selectable day, yyyy-mm-dd in the library's timezone. */
  today: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // once a range is chosen, the option shows the range itself — a control
  // reading "Custom range…" would leave the reader hunting for what it covers
  const options = [
    ...PRESETS.map((p) => ({ value: p.key, label: p.label })),
    {
      value: "custom",
      label: period.key === "custom" ? period.label : "Custom range…",
    },
  ];

  useEffect(() => {
    if (!calendarOpen) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [calendarOpen]);

  function choose(value: string) {
    if (value === "custom") {
      setCalendarOpen(true);
      return;
    }
    const qs = value === "this-month" ? "" : `?period=${value}`;
    start(() => router.push(`/reports${qs}`));
  }

  function apply(from: string, to: string) {
    setCalendarOpen(false);
    start(() => router.push(`/reports?from=${from}&to=${to}`));
  }

  return (
    <div className={`transition-opacity ${pending ? "opacity-60" : ""}`}>
      <div ref={wrapRef} className="relative">
        <Select
          ariaLabel="Reporting period"
          value={period.key}
          onChange={choose}
          options={options}
          buttonClassName="w-56 rounded-xl border border-mist-deep bg-paper px-4 py-2.5 text-sm font-semibold outline-none transition-colors focus:ring-2 focus:ring-gold-500/25"
        />
        {calendarOpen && (
          <DateRangeCalendar
            from={period.key === "custom" ? period.fromDate : ""}
            to={period.key === "custom" ? period.toDate : ""}
            max={today}
            onApply={apply}
            onCancel={() => setCalendarOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
