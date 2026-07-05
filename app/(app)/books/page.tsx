import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Books" };

export default function BooksPage() {
  return (
    <PageShell title="Books" subtitle="The library catalogue.">
      <ComingSoon
        milestone="M1"
        points={[
          "Add, edit and delete books with cover images",
          "Track copies, shelf location, category and language",
          "Generate a QR / barcode for every book",
          "Bulk-import a catalogue from CSV, with ISBN autofill",
          "Search and filter across the whole collection",
        ]}
      />
    </PageShell>
  );
}
