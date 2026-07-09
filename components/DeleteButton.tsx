"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";

/**
 * Trash-icon button that asks for confirmation in a small popup before running
 * a destructive action. `onDelete` is typically a server action bound with its
 * id, or a client closure calling one.
 */
export default function DeleteButton({
  onDelete,
  name,
  title = "Delete",
  description,
  confirmLabel = "Delete",
  redirectTo,
  onDeleted,
  className,
}: {
  onDelete: () => Promise<unknown>;
  name: string;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  redirectTo?: string;
  onDeleted?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending]);

  function confirm() {
    start(async () => {
      await onDelete();
      onDeleted?.();
      if (redirectTo) window.location.href = redirectTo;
      else setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Delete ${name}`}
        aria-label={`Delete ${name}`}
        className={className ?? "flex h-8 w-8 items-center justify-center rounded-lg text-ink-mute transition-colors hover:bg-danger-soft hover:text-danger"}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
        </svg>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
            <div
              className="absolute inset-0 bg-navy-950/45"
              onClick={() => !pending && setOpen(false)}
            />
            <div className="relative w-full max-w-sm rounded-2xl bg-cream p-6 shadow-[0_24px_80px_rgba(5,31,66,0.4)]">
              <div className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-danger-soft text-danger">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-semibold text-navy-900">{title}</h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    {description ?? (
                      <>
                        This will permanently delete <strong className="font-semibold text-navy-900">{name}</strong>. This can&rsquo;t be undone.
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setOpen(false)}
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
                  {pending ? "Deleting…" : confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
