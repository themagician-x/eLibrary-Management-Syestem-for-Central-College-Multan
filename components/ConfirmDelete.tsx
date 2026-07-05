"use client";

import { useState, useTransition } from "react";

/** Inline confirm-then-delete button. `onDelete` is a server action bound with its id. */
export default function ConfirmDelete({
  onDelete,
  name,
  redirectTo,
}: {
  onDelete: () => Promise<void>;
  name: string;
  redirectTo?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      await onDelete();
      if (redirectTo) window.location.href = redirectTo;
    });
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5">
        <button type="button" disabled={pending} onClick={run} className="rounded-lg bg-danger px-2.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-danger/90 disabled:opacity-60">
          {pending ? "Deleting…" : "Confirm"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-mute hover:bg-mist">
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      title={`Delete ${name}`}
      aria-label={`Delete ${name}`}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-mute transition-colors hover:bg-danger-soft hover:text-danger"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      </svg>
    </button>
  );
}
