import Modal from "@/components/Modal";
import BookForm from "@/app/(app)/books/book-form";
import { createBook } from "@/app/(app)/books/actions";
import { getUsedCategories } from "@/lib/categories";

export default async function InterceptedNewBook() {
  const categories = await getUsedCategories();

  return (
    <Modal title="Add a book" subtitle="Add a new title to the catalogue.">
      <BookForm action={createBook} submitLabel="Add book" categories={categories} />
    </Modal>
  );
}
