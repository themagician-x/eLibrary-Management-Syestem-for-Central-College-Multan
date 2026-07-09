"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Student } from "@/lib/types";
import StudentDrawer from "@/components/StudentDrawer";

/**
 * Clickable student cell that opens the student drawer in place (instead of
 * navigating to the student page). Fetches the full row on click.
 */
export default function StudentPeek({
  studentId,
  className,
  children,
}: {
  studentId?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const [student, setStudent] = useState<Student | null>(null);

  async function open() {
    if (!studentId) return;
    const supabase = createClient();
    const { data } = await supabase.from("students").select("*").eq("id", studentId).single();
    if (data) setStudent(data as Student);
  }

  return (
    <>
      <button type="button" onClick={open} disabled={!studentId} className={`cursor-pointer disabled:cursor-default ${className ?? ""}`}>
        {children}
      </button>
      <StudentDrawer student={student} onClose={() => setStudent(null)} />
    </>
  );
}
