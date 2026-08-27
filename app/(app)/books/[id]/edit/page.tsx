import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import type { Book } from "@/lib/types";
import BookForm from "../../book-form";
import { updateBook } from "../../actions";
import { getUsedCategories, getUsedShelves } from "@/lib/categories";

export const metadata: Metadata = { title: "Edit book" };

/**
 * The non-intercepted match for /books/[id]/edit: what a refresh, a typed URL
 * or a bookmark lands on, since a refresh is not a navigation and so nothing
 * intercepts it.
 *
 * Unlike the "add" routes, this one renders rather than redirecting. Editing a
 * named record is worth a URL of its own — it can be returned to, sent to
 * someone, or kept open in a tab — where "add a book" describes no record and
 * has nothing to come back to.
 */
export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: book }, categories, shelves] = await Promise.all([
    // the shelf rows drive the editor's shelf list, so they must come with it
    supabase.from("books").select("*,book_shelves(shelf,copies)").eq("id", id).single(),
    getUsedCategories(),
    getUsedShelves(),
  ]);

  if (!book) notFound();

  const action = updateBook.bind(null, id);

  return (
    <PageShell
      title="Edit book"
      subtitle={(book as Book).title}
      actions={
        <Link href={`/books/${id}`} className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist">
          ← Back to the book
        </Link>
      }
    >
      <BookForm
        action={action}
        book={book as Book}
        submitLabel="Save changes"
        categories={categories}
        shelves={shelves}
      />
    </PageShell>
  );
}
