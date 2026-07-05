import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Students" };

export default function StudentsPage() {
  return (
    <PageShell title="Students" subtitle="Student records — not accounts.">
      <ComingSoon
        milestone="M2"
        points={[
          "Create student profiles: name, roll no, class / department",
          "Store email, phone, photo and membership status",
          "See each student's current loans, history and fines",
          "Search students and open a profile in one click",
        ]}
      />
    </PageShell>
  );
}
