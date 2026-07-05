import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PageShell title="Settings" subtitle="Library rules and preferences.">
      <ComingSoon
        milestone="M7"
        points={[
          "Loan period (default 14 days) and max books per student",
          "Daily fine rate for overdue books",
          "Holiday calendar — no fines on closed days",
        ]}
      />
    </PageShell>
  );
}
