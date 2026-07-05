"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelReservation, issueReserved } from "./actions";

export default function ReservationActions({
  id,
  bookId,
  studentId,
  ready,
}: {
  id: string;
  bookId: string;
  studentId: string;
  ready: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setErr(null);
      const res = await fn();
      if (res.error) setErr(res.error);
      else router.refresh();
    });

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {ready && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => issueReserved(bookId, studentId))}
            className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-bold text-cream transition-colors hover:bg-navy-800 disabled:opacity-50"
          >
            Issue
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => cancelReservation(id))}
          className="rounded-lg border border-mist-deep px-2.5 py-1.5 text-xs font-bold text-ink-soft transition-colors hover:bg-mist disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {err && <span className="text-[0.7rem] text-danger">{err}</span>}
    </div>
  );
}
