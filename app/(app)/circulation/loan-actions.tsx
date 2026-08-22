"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/config";
import WriteOffDialog from "@/components/WriteOffDialog";
import type { WriteOffReason } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { returnLoan, renewLoan, writeOffLoan } from "./actions";

export default function LoanActions({
  loanId,
  bookId,
  bookTitle,
  borrower,
  canRenew,
}: {
  loanId: string;
  bookId: string;
  bookTitle: string;
  borrower: string;
  canRenew: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [writeOff, setWriteOff] = useState(false);

  const returnBook = () =>
    start(async () => {
      const res = await returnLoan(loanId);
      if (res.error) return toast.error("Couldn't return the book", res.error);

      if (res.fine && res.fine > 0) {
        toast.success(
          `Returned — ${money(res.fine)} late fee charged`,
          `${bookTitle} is back on the shelf. The fee is on ${borrower}'s account.`
        );
      } else {
        toast.success("Book returned", `${bookTitle} is back on the shelf.`);
      }
      router.refresh();
    });

  const renew = () =>
    start(async () => {
      const res = await renewLoan(loanId);
      if (res.error) return toast.error("Couldn't renew the loan", res.error);
      toast.success("Loan renewed", `${borrower} has ${bookTitle} for another loan period.`);
      router.refresh();
    });

  async function confirmWriteOff(reason: WriteOffReason, note: string, charge: number) {
    const res = await writeOffLoan(bookId, loanId, reason, note, charge);
    if (res.error) return res;

    toast.success(
      reason === "lost" ? "Copy written off as lost" : "Copy written off as damaged",
      charge > 0
        ? `${bookTitle} left the inventory. ${money(charge)} charged to ${borrower}.`
        : `${bookTitle} left the inventory and ${borrower}'s loan is closed.`
    );
    router.refresh();
    return res;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {canRenew && (
          <button type="button" disabled={pending} onClick={renew} className="rounded-lg border border-navy-900 px-2.5 py-1.5 text-xs font-bold text-navy-900 transition-colors hover:bg-navy-900 hover:text-cream disabled:opacity-50">
            Renew
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => setWriteOff(true)}
          title="Book lost or damaged beyond use"
          className="whitespace-nowrap rounded-lg border border-danger/40 px-2.5 py-1.5 text-xs font-bold text-danger transition-colors hover:bg-danger hover:text-white disabled:opacity-50"
        >
          Lost / Damaged
        </button>
        <button type="button" disabled={pending} onClick={returnBook} className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-bold text-cream transition-colors hover:bg-navy-800 disabled:opacity-50">
          {pending ? "…" : "Return"}
        </button>
      </div>

      <WriteOffDialog
        open={writeOff}
        onClose={() => setWriteOff(false)}
        onConfirm={confirmWriteOff}
        bookTitle={bookTitle}
        borrower={borrower}
        withCharge
      />
    </div>
  );
}
