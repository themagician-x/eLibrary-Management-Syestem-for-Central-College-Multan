"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Select from "@/components/Select";
import type { WriteOffReason } from "@/lib/types";

const field =
  "w-full rounded-xl border border-mist-deep bg-paper px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-soft";

/**
 * Confirms retiring one copy from the inventory. `withCharge` is on when the
 * copy is out with a student — then the replacement cost can be billed to them
 * in the same step. For a shelf copy there is nobody to charge, so the amount
 * field is hidden.
 */
type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: WriteOffReason, note: string, charge: number) => Promise<{ error?: string }>;
  bookTitle: string;
  borrower?: string | null;
  withCharge?: boolean;
  defaultCharge?: string;
};

/** Mounts only while open, so every visit starts from a clean form. */
export default function WriteOffDialog({ open, ...rest }: Props) {
  if (!open || typeof document === "undefined") return null;
  return <WriteOffForm {...rest} />;
}

function WriteOffForm({
  onClose,
  onConfirm,
  bookTitle,
  borrower,
  withCharge = false,
  defaultCharge = "",
}: Omit<Props, "open">) {
  const [reason, setReason] = useState<WriteOffReason>("lost");
  const [note, setNote] = useState("");
  const [charge, setCharge] = useState(defaultCharge);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pending, onClose]);

  async function confirm() {
    setError(null);
    setPending(true);
    const res = await onConfirm(reason, note, withCharge ? Number(charge || 0) : 0);
    setPending(false);
    if (res.error) setError(res.error);
    else onClose();
  }

  const verb = reason === "lost" ? "lost" : "damaged beyond use";

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Write off a copy">
      <div className="absolute inset-0 bg-navy-950/45" onClick={() => !pending && onClose()} />
      <div className="relative w-full max-w-md rounded-2xl bg-cream p-6 shadow-[0_24px_80px_rgba(5,31,66,0.4)]">
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-warn-soft text-warn">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-navy-900">Write off a copy</h2>
            <p className="mt-1 text-sm text-ink-soft">
              One copy of <strong className="font-semibold text-navy-900">{bookTitle}</strong> is {verb}.
              It leaves the inventory for good{borrower ? <> and {borrower}&rsquo;s loan is closed</> : null}.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <span className={label}>Reason</span>
            <Select
              ariaLabel="Reason"
              value={reason}
              onChange={(v) => setReason(v as WriteOffReason)}
              buttonClassName="w-full rounded-xl border bg-paper px-3.5 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-gold-500/25"
              options={[
                { value: "lost", label: "Lost" },
                { value: "damaged", label: "Damaged beyond use" },
              ]}
            />
          </div>

          {withCharge && (
            <div>
              <label className={label} htmlFor="wo-charge">Replacement charge (Rs)</label>
              <input
                id="wo-charge"
                type="number"
                min="0"
                value={charge}
                onChange={(e) => setCharge(e.target.value)}
                placeholder="0 for no charge"
                className={field}
              />
              <p className="mt-1.5 text-xs text-ink-mute">Billed to {borrower ?? "the borrower"} as an unpaid fine. Leave 0 to skip.</p>
            </div>
          )}

          <div>
            <label className={label} htmlFor="wo-note">Note (optional)</label>
            <input
              id="wo-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Spine broken, pages missing"
              className={field}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={confirm}
            className="rounded-xl bg-danger px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-danger/90 disabled:opacity-60"
          >
            {pending ? "Writing off…" : "Write off copy"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
