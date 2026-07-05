"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/config";
import { returnLoan, renewLoan, type ActionResult } from "./actions";

export default function LoanActions({
  loanId,
  canRenew,
}: {
  loanId: string;
  canRenew: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {canRenew && (
          <button type="button" disabled={pending} onClick={() => run(renewLoan)} className="rounded-lg border border-navy-900 px-2.5 py-1.5 text-xs font-bold text-navy-900 transition-colors hover:bg-navy-900 hover:text-cream disabled:opacity-50">
            Renew
          </button>
        )}
        <button type="button" disabled={pending} onClick={() => run(returnLoan)} className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-bold text-cream transition-colors hover:bg-navy-800 disabled:opacity-50">
          {pending ? "…" : "Return"}
        </button>
      </div>
      {err && <span className="text-[0.7rem] text-danger">{err}</span>}
      {info && <span className="text-[0.7rem] font-semibold text-warn">{info}</span>}
    </div>
  );
}
