import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import ChargePanel from "../charge-panel";

export const metadata: Metadata = { title: "Add a charge" };

export default function NewChargePage() {
  return (
    <PageShell
      title="Add a charge"
      subtitle="Bill a student for a lost or damaged book."
      actions={
        <Link href="/fines" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist">
          ← Back to fines
        </Link>
      }
    >
      <div className="max-w-xl">
        <ChargePanel />
      </div>
    </PageShell>
  );
}
