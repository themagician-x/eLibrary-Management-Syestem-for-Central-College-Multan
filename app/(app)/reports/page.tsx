import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <PageShell title="Reports" subtitle="Insights across the library.">
      <ComingSoon
        milestone="M7"
        points={[
          "Most-borrowed books and category breakdowns",
          "Overdue and outstanding-fine summaries",
          "Export any report as CSV or PDF",
        ]}
      />
    </PageShell>
  );
}
