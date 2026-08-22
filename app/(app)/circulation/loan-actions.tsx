"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/config";
import WriteOffDialog from "@/components/WriteOffDialog";
import type { WriteOffReason } from "@/lib/types";
import { returnLoan, renewLoan, writeOffLoan, type ActionResult } from "./actions";

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
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [writeOff, setWriteOff] = useState(false);

  const run = (fn: (id: string) => Promise<ActionResult>) =>
    start(async () => {
      setErr(null);
      setInfo(null);
      const res = await fn(loanId);
      if (res.error) {
        setErr(res.error);
      } else if (res.fine && res.fine > 0) {
        setInfo(`${money(res.fine)} late fee charged`);
        setTimeout(() => router.refresh(), 1700);
      } else {
        router.refresh();
      }
    });

  async function confirmWriteOff(reason: WriteOffReason, note: string, charge: number) {
    const res = await writeOffLoan(bookId, loanId, reason, note, charge);
    if (!res.error) router.refresh();
    return res;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {canRenew && (
          <button type="button" disabled={pending} onClick={() => run(renewLoan)} className="rounded-lg border border-navy-900 px-2.5 py-1.5 text-xs font-bold text-navy-900 transition-colors hover:bg-navy-900 hover:text-cream disabled:opacity-50">
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
        <button type="button" disabled={pending} onClick={() => run(returnLoan)} className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-bold text-cream transition-colors hover:bg-navy-800 disabled:opacity-50">
          {pending ? "…" : "Return"}
        </button>
      </div>
      {err && <span className="text-[0.7rem] text-danger">{err}</span>}
      {info && <span className="text-[0.7rem] font-semibold text-warn">{info}</span>}

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
