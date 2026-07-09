import { notFound } from "next/navigation";
import Modal from "@/components/Modal";
import BookForm from "@/app/(app)/books/book-form";
import { updateBook } from "@/app/(app)/books/actions";
import type { Book } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export default async function InterceptedEditBook({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: book } = await supabase.from("books").select("*").eq("id", id).single();
  if (!book) notFound();

  return (
    <Modal title="Edit book" subtitle={(book as Book).title}>
      <BookForm action={updateBook.bind(null, id)} book={book as Book} submitLabel="Save changes" />
    </Modal>
  );
}
