"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WriteOffDialog from "@/components/WriteOffDialog";
import { useToast } from "@/components/Toast";
import type { BookShelf, WriteOffReason } from "@/lib/types";
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
  shelves,
}: {
  bookId: string;
  bookTitle: string;
  disabled?: boolean;
  shelves?: BookShelf[] | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  async function confirm(
    reason: WriteOffReason,
    note: string,
    _charge: number,
    shelf: string | null
  ) {
    const res = await writeOffCopy(bookId, reason, note, shelf);
    if (res.error) return res;

    toast.success(
      reason === "lost" ? "Copy written off as lost" : "Copy written off as damaged",
      `One copy of ${bookTitle} has left the inventory.`
    );
    router.refresh();
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
        shelves={shelves}
      />
    </>
  );
}
