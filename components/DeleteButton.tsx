"use client";

import { useState, useTransition } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

/**
 * Trash-icon button that asks for confirmation before running a destructive
 * action. `onDelete` is typically a server action bound with its id, or a
 * client closure calling one. If the database refuses — a student who still
 * owes money, a book whose copies are out — the reason is shown in place and
 * the prompt stays open.
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
  onDelete: () => Promise<{ error?: string } | unknown>;
  name: string;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  redirectTo?: string;
  onDeleted?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirm() {
    start(async () => {
      setError(null);
      const res = (await onDelete()) as { error?: string } | undefined;

      // the database refuses deletes that would erase an open loan or an
      // unpaid fine — keep the prompt up and show why
      if (res?.error) {
        setError(res.error);
        return;
      }

      onDeleted?.();
      if (redirectTo) window.location.href = redirectTo;
      else setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        title={`Delete ${name}`}
        aria-label={`Delete ${name}`}
        className={
          className ??
          "flex h-8 w-8 items-center justify-center rounded-lg text-ink-mute transition-colors hover:bg-danger-soft hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"
        }
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
        </svg>
      </button>

      <ConfirmDialog
        open={open}
        tone="danger"
        title={title}
        description={
          description ?? (
            <>
              This will permanently delete{" "}
              <strong className="font-semibold text-navy-900">{name}</strong>. This can&rsquo;t be
              undone.
            </>
          )
        }
        confirmLabel={error ? "Try again" : confirmLabel}
        pending={pending}
        pendingLabel="Deleting…"
        error={error}
        onCancel={() => setOpen(false)}
        onConfirm={confirm}
      />
    </>
  );
}
