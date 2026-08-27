import Modal from "@/components/Modal";
import BookForm from "@/app/(app)/books/book-form";
import { createBook } from "@/app/(app)/books/actions";
import { getUsedCategories, getUsedShelves } from "@/lib/categories";

export default async function InterceptedNewBook() {
  const [categories, shelves] = await Promise.all([
    getUsedCategories(),
    getUsedShelves(),
  ]);

  return (
    <Modal title="Add a book" subtitle="Add a new title to the catalogue.">
      <BookForm action={createBook} submitLabel="Add book" categories={categories} shelves={shelves} />
    </Modal>
  );
}
