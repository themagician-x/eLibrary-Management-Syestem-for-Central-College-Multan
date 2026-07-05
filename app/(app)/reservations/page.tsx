import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Reservations" };

export default function ReservationsPage() {
  return (
    <PageShell title="Reservations" subtitle="Holds for books that are out.">
      <ComingSoon
        milestone="M5"
        points={[
          "Queue a student for a book that's currently borrowed",
          "See the waiting list and each student's position",
          "Auto-notify the next in line when a copy is returned",
        ]}
      />
    </PageShell>
  );
}
