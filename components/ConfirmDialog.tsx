"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export type ConfirmTone = "danger" | "warn";

const TONE: Record<ConfirmTone, { badge: string; button: string }> = {
  danger: {
    badge: "bg-danger-soft text-danger",
    button: "bg-danger text-white hover:bg-danger/90",
  },
  warn: {
    badge: "bg-warn-soft text-warn",
    button: "bg-navy-900 text-cream hover:bg-navy-800",
  },
};

/**
 * The one confirmation prompt in the app. Every "are you sure" goes through it
 * — deleting a record, discarding unsaved edits — so they look and behave the
 * same rather than some being native browser dialogs.
 *
 * Cancel is focused on open and Escape cancels, so the safe choice is always
 * the default one.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  pending = false,
  pendingLabel,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  pending?: boolean;
  pendingLabel?: string;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending, onCancel]);

  if (!open || typeof document === "undefined") return null;
  const t = TONE[tone];

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-navy-950/45" onClick={() => !pending && onCancel()} />

      <div className="relative w-full max-w-sm rounded-2xl bg-cream p-6 shadow-[0_24px_80px_rgba(5,31,66,0.4)]">
        <div className="flex items-start gap-3.5">
          <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${t.badge}`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-navy-900">{title}</h2>
            <div className="mt-1 text-sm text-ink-soft">{description}</div>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 disabled:opacity-60 ${t.button}`}
          >
            {pending ? (pendingLabel ?? "Working…") : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
