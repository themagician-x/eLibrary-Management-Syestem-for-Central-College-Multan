"use client";

import { useState } from "react";
import { money } from "@/lib/config";
import type { FineWithRefs } from "@/lib/types";
import TableScroll from "@/components/TableScroll";
import FineActions from "./fine-actions";
import FineDrawer from "./fine-drawer";

const COLS = "lg:grid-cols-[1.3fr_1fr_100px_110px_190px]";

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const reasonStyle: Record<string, string> = {
  late: "bg-warn-soft text-warn",
  lost: "bg-danger-soft text-danger",
  damaged: "bg-gold-100 text-gold-700",
};
const statusStyle: Record<string, string> = {
  unpaid: "bg-danger-soft text-danger",
  paid: "bg-ok-soft text-ok",
  waived: "bg-mist text-ink-soft",
};

export default function FinesTable({ fines }: { fines: FineWithRefs[] }) {
  const [selected, setSelected] = useState<FineWithRefs | null>(null);

  return (
    <>
      <TableScroll
        header={
          <div className={`hidden gap-4 border-b border-mist-deep bg-mist px-5 py-3 font-mono text-[0.6rem] uppercase tracking-wider text-ink-mute lg:grid ${COLS}`}>
            <span>Student</span><span>Reason</span><span>Amount</span><span>Date</span><span className="text-right">Status / Actions</span>
          </div>
        }
      >
        {fines.map((f) => (
          <div
            key={f.id}
            onClick={() => setSelected(f)}
            className={`group grid cursor-pointer grid-cols-1 gap-2 border-b border-mist bg-paper px-5 py-3.5 transition-colors last:border-0 hover:bg-cream lg:items-center lg:gap-4 ${COLS}`}
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold text-navy-900 group-hover:text-navy-700">
                {f.student?.name ?? "Unknown"}
              </span>
              <span className="block truncate text-xs text-ink-mute">{f.student?.roll_no ?? ""}</span>
            </span>

            <span className="min-w-0">
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold capitalize ${reasonStyle[f.reason]}`}>
                {f.reason}
              </span>
              <span className="mt-0.5 block truncate text-xs text-ink-mute">
                {f.loan?.book?.title ?? f.note ?? ""}
              </span>
            </span>

            <span className="font-display text-base font-semibold text-navy-900">{money(f.amount)}</span>
            <span className="text-sm text-ink-soft">{fmt(f.created_at)}</span>

            {/* the buttons act on the charge, not on opening it */}
            <div
              className="flex items-center justify-between gap-2 lg:justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              {f.status !== "unpaid" && (
                <span className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold capitalize ${statusStyle[f.status]} lg:hidden`}>
                  {f.status}
                </span>
              )}
              <FineActions
                id={f.id}
                status={f.status}
                amount={Number(f.amount)}
                student={f.student?.name ?? "the student"}
              />
            </div>
          </div>
        ))}
      </TableScroll>

      <FineDrawer fine={selected} onClose={() => setSelected(null)} />
    </>
  );
}
