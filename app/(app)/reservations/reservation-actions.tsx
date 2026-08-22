"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { cancelReservation, issueReserved } from "./actions";

export default function ReservationActions({
  id,
  bookId,
  studentId,
  ready,
  bookTitle,
  student,
}: {
  id: string;
  bookId: string;
  studentId: string;
  ready: boolean;
  bookTitle: string;
  student: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  const run = (
    fn: () => Promise<{ error?: string }>,
    failure: string,
    title: string,
    detail: string
  ) =>
    start(async () => {
      const res = await fn();
      if (res.error) return toast.error(failure, res.error);
      toast.success(title, detail);
      router.refresh();
    });

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {ready && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                () => issueReserved(bookId, studentId),
                "Couldn't issue the book",
                "Book issued",
                `${bookTitle} is now on loan to ${student}.`
              )
            }
            className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-bold text-cream transition-colors hover:bg-navy-800 disabled:opacity-50"
          >
            Issue
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => cancelReservation(id),
              "Couldn't cancel the hold",
              "Hold cancelled",
              `${student}'s hold on ${bookTitle} has been removed.`
            )
          }
          className="rounded-lg border border-mist-deep px-2.5 py-1.5 text-xs font-bold text-ink-soft transition-colors hover:bg-mist disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
