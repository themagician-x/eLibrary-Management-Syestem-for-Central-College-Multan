import Modal from "@/components/Modal";
import ImportBooks from "@/app/(app)/books/import-books";

export default function InterceptedImport() {
  return (
    <Modal title="Import books" subtitle="Bulk-add a catalogue from a CSV file.">
      <ImportBooks />
    </Modal>
  );
}
