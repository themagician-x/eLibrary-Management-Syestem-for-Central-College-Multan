import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Fines" };

export default function FinesPage() {
  return (
    <PageShell title="Fines" subtitle="Late, lost and damaged charges.">
      <ComingSoon
        milestone="M4"
        points={[
          "Auto-calculate late fees after the 14-day loan period",
          "Mark fines as paid or waive them",
          "Add charges for lost or damaged books",
          "See outstanding fines per student",
        ]}
      />
    </PageShell>
  );
}
