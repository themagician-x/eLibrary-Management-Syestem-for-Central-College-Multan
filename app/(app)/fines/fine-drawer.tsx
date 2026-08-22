"use client";

import { useEffect, useState } from "react";
import { money } from "@/lib/config";
import type { FineWithRefs } from "@/lib/types";
import type { FineContext } from "@/lib/fines";
import FineBreakdown from "@/components/FineBreakdown";
import BookPeek from "@/components/BookPeek";
import StudentPeek from "@/components/StudentPeek";
import FineActions from "./fine-actions";

const day = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const reasonStyle: Record<string, string> = {
  late: "bg-warn-soft text-warn",
  lost: "bg-danger-soft text-danger",
  damaged: "bg-gold-100 text-gold-700",
};
const statusStyle: Record<string, string> = {
  unpaid: "bg-danger text-white",
  paid: "bg-ok-soft text-ok",
  waived: "bg-mist text-ink-soft",
};

/** Everything behind one charge: who, which book, the dates, and the maths. */
export default function FineDrawer({
  fine,
  onClose,
}: {
  fine: FineWithRefs | null;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState<FineWithRefs | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (fine) {
      // Mirroring the prop keeps the outgoing charge on screen while the drawer
      // slides away; the timeout below clears it once the animation finishes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrent(fine);
      const r = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(r);
    }
    setShown(false);
    const t = setTimeout(() => setCurrent(null), 300);
    return () => clearTimeout(t);
  }, [fine]);

  useEffect(() => {
    if (!fine) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fine, onClose]);

  if (!current) return null;
  const f = current;
  const ctx = f as unknown as FineContext;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`${f.reason} charge`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-navy-950/40 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
      />

      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream shadow-[0_0_60px_rgba(5,31,66,0.35)] transition-transform duration-300 ${shown ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-mist-deep px-6 py-5">
          <div className="min-w-0">
            <p className="font-display text-2xl font-semibold text-navy-900">{money(Number(f.amount))}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold capitalize ${reasonStyle[f.reason]}`}>
                {f.reason}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold capitalize ${statusStyle[f.status]}`}>
                {f.status}
              </span>
              <span className="text-xs text-ink-mute">Charged {day(f.created_at)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-ink-mute transition-colors hover:bg-mist hover:text-navy-900"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* body */}
        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-5">
          <div>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">Charged to</p>
            <StudentPeek
              studentId={f.student?.id}
              className="group block w-full rounded-xl border border-mist-deep bg-paper px-4 py-3 text-left transition-colors hover:border-navy-600"
            >
              <span className="block truncate text-sm font-semibold text-navy-900 group-hover:text-navy-700">
                {f.student?.name ?? "Unknown student"}
              </span>
              <span className="block truncate font-mono text-xs text-ink-mute">
                {f.student?.roll_no ?? "No roll number"}
              </span>
            </StudentPeek>
          </div>

          {f.loan?.book && (
            <div>
              <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">Book</p>
              <BookPeek
                bookId={f.loan.book.id}
                className="group block w-full rounded-xl border border-mist-deep bg-paper px-4 py-3 text-left transition-colors hover:border-navy-600"
              >
                <span className="block truncate text-sm font-semibold text-navy-900 group-hover:text-navy-700">
                  {f.loan.book.title}
                </span>
              </BookPeek>
            </div>
          )}

          <div>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">Why this charge</p>
            <div className="rounded-xl border border-mist-deep bg-paper px-4 py-3.5">
              <FineBreakdown fine={ctx} />
            </div>
          </div>
        </div>

        {/* actions */}
        <div className="border-t border-mist-deep px-6 py-4">
          <FineActions
            id={f.id}
            status={f.status}
            amount={Number(f.amount)}
            student={f.student?.name ?? "the student"}
            onDone={onClose}
            wide
          />
        </div>
      </div>
    </div>
  );
}
