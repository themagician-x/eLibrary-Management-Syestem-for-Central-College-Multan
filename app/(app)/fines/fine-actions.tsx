"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FineStatus } from "@/lib/types";
import { money } from "@/lib/config";
import { useToast } from "@/components/Toast";
import { setFineStatus } from "./actions";

export default function FineActions({
  id,
  status,
  amount,
  student,
  onDone,
  wide,
}: {
  id: string;
  status: FineStatus;
  amount: number;
  student: string;
  /** Called after a successful change — lets the drawer close itself. */
  onDone?: () => void;
  /** Fill the width, for the drawer footer rather than a table cell. */
  wide?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  const WORDING: Record<string, { title: string; detail: string }> = {
    paid: { title: "Payment recorded", detail: `${money(amount)} collected from ${student}.` },
    waived: { title: "Fine waived", detail: `${student} no longer owes ${money(amount)}.` },
    unpaid: { title: "Charge reopened", detail: `${money(amount)} is outstanding on ${student}'s account again.` },
  };

  const set = (s: "paid" | "waived" | "unpaid") =>
    start(async () => {
      // this used to swallow failures silently
      const res = await setFineStatus(id, s);
      if (res?.error) return toast.error("Couldn't update the charge", res.error);

      const w = WORDING[s];
      toast.success(w.title, w.detail);
      router.refresh();
      onDone?.();
    });

  if (status === "unpaid") {
    return (
      <div className={`flex items-center gap-1.5 ${wide ? "" : "justify-end"}`}>
        <button type="button" disabled={pending} onClick={() => set("paid")} className={`rounded-lg bg-ok px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-ok/90 disabled:opacity-50 ${wide ? "flex-1 py-2.5 text-sm" : ""}`}>
          Mark paid
        </button>
        <button type="button" disabled={pending} onClick={() => set("waived")} className={`rounded-lg border border-mist-deep px-2.5 py-1.5 text-xs font-bold text-ink-soft transition-colors hover:bg-mist disabled:opacity-50 ${wide ? "flex-1 py-2.5 text-sm" : ""}`}>
          Waive
        </button>
      </div>
    );
  }

  return (
    <div className={`flex ${wide ? "" : "justify-end"}`}>
      <button type="button" disabled={pending} onClick={() => set("unpaid")} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-mute transition-colors hover:bg-mist hover:text-navy-900 disabled:opacity-50 ${wide ? "w-full border border-mist-deep py-2.5 text-sm" : ""}`}>
        Undo
      </button>
    </div>
  );
}
