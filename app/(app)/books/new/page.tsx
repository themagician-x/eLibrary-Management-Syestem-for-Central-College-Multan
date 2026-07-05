import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import BookForm from "../book-form";
import { createBook } from "../actions";

export const metadata: Metadata = { title: "Add book" };

export default function NewBookPage() {
  return (
    <PageShell
      title="Add a book"
      subtitle="Add a new title to the catalogue."
      actions={
        <Link href="/books" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist">
          ← Back to books
        </Link>
      }
    >
      <BookForm action={createBook} submitLabel="Add book" />
    </PageShell>
  );
}
