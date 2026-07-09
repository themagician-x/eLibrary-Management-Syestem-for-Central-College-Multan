import Modal from "@/components/Modal";
import BookForm from "@/app/(app)/books/book-form";
import { createBook } from "@/app/(app)/books/actions";

export default function InterceptedNewBook() {
  return (
    <Modal title="Add a book" subtitle="Add a new title to the catalogue.">
      <BookForm action={createBook} submitLabel="Add book" />
    </Modal>
  );
}
