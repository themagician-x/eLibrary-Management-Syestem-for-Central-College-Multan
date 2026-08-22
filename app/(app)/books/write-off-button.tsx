"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WriteOffDialog from "@/components/WriteOffDialog";
import type { WriteOffReason } from "@/lib/types";
import { writeOffCopy } from "./actions";

/**
 * Retires a copy sitting on the shelf. Copies that are out with a student are
 * written off from Circulation instead, so the loan closes and the borrower can
 * be charged — the database refuses this path when no copy is on the shelf.
 */
export default function WriteOffButton({
  bookId,
  bookTitle,
  disabled,
}: {
  bookId: string;
  bookTitle: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function confirm(reason: WriteOffReason, note: string) {
    const res = await writeOffCopy(bookId, reason, note);
    if (!res.error) router.refresh();
    return res;
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        title={disabled ? "Every copy is out on loan" : "Mark a shelf copy lost or damaged"}
        className="rounded-xl border border-danger/40 px-4 py-2 text-sm font-bold text-danger transition-colors hover:bg-danger hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-danger"
      >
        Lost / Damaged
      </button>

      <WriteOffDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        bookTitle={bookTitle}
      />
    </>
  );
}
