import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import IssuePanel from "../issue-panel";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Issue a book" };

export default async function IssueBookPage() {
  const settings = await getSettings();
  return (
    <PageShell
      title="Issue a book"
      subtitle="Loan a book to a student."
      actions={
        <Link href="/circulation" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist">
          ← Back to circulation
        </Link>
      }
    >
      <div className="max-w-xl">
        <IssuePanel loanDays={settings.loan_days} maxBooks={settings.max_books} />
      </div>
    </PageShell>
  );
}
