import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Circulation" };

export default function CirculationPage() {
  return (
    <PageShell title="Circulation" subtitle="Issue, return and renew books.">
      <ComingSoon
        milestone="M3"
        points={[
          "Issue a book to a student with a 14-day due date",
          "Return and renew, with borrowing limits enforced",
          "Scan a barcode to check a book out in seconds",
          "See who currently holds what, and what's overdue",
        ]}
      />
    </PageShell>
  );
}
