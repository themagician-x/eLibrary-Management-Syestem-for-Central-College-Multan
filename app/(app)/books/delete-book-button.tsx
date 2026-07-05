"use client";

import { useState } from "react";
import { deleteBook } from "./actions";

export default function DeleteBookButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await deleteBook(id);
          }}
          className="rounded-lg bg-danger px-2.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-danger/90 disabled:opacity-60"
        >
          {busy ? "Deleting…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-mute hover:bg-mist"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      title={`Delete “${title}”`}
      aria-label={`Delete ${title}`}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-mute transition-colors hover:bg-danger-soft hover:text-danger"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      </svg>
    </button>
  );
}
