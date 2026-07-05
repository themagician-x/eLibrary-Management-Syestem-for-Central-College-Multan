import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import type { Book } from "@/lib/types";
import BookForm from "../../book-form";
import { updateBook } from "../../actions";

export const metadata: Metadata = { title: "Edit book" };

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: book } = await supabase.from("books").select("*").eq("id", id).single();

  if (!book) notFound();

  const action = updateBook.bind(null, id);

  return (
    <PageShell
      title="Edit book"
      subtitle={(book as Book).title}
      actions={
        <Link href="/books" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist">
          ← Back to books
        </Link>
      }
    >
      <BookForm action={action} book={book as Book} submitLabel="Save changes" />
    </PageShell>
  );
}
