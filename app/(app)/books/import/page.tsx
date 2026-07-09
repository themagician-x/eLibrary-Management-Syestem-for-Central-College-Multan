import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import ImportBooks from "../import-books";

export const metadata: Metadata = { title: "Import books" };

export default function ImportPage() {
  return (
    <PageShell
      title="Import books"
      subtitle="Bulk-add a catalogue from a CSV file."
      actions={
        <Link href="/books" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist">
          ← Back to books
        </Link>
      }
    >
      <ImportBooks />
    </PageShell>
  );
}
