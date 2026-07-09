import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import ReservePanel from "../reserve-panel";

export const metadata: Metadata = { title: "Place a hold" };

export default function NewHoldPage() {
  return (
    <PageShell
      title="Place a hold"
      subtitle="Reserve a book for a student."
      actions={
        <Link href="/reservations" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist">
          ← Back to reservations
        </Link>
      }
    >
      <div className="max-w-xl">
        <ReservePanel />
      </div>
    </PageShell>
  );
}
