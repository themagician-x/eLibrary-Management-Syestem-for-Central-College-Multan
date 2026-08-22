"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { studentLookup, bookLookup } from "@/lib/search";
import { useToast } from "@/components/Toast";
import AsyncPicker, { type PickOption } from "@/components/AsyncPicker";
import { reserveBook } from "./actions";

export default function ReservePanel() {
  const router = useRouter();
  const toast = useToast();
  const [book, setBook] = useState<PickOption | null>(null);
  const [student, setStudent] = useState<PickOption | null>(null);
  const [pending, setPending] = useState(false);
  const [, startRefresh] = useTransition();

  const searchBooks = useCallback(async (term: string): Promise<PickOption[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("books")
      .select("id,title,author,available_copies,barcode")
      .or(bookLookup(term))
      .order("title")
      .limit(8);
    return (data ?? []).map((b) => ({
      id: b.id,
      label: b.title,
      sub: `${b.author ?? "Unknown"} · ${b.available_copies > 0 ? `${b.available_copies} available` : "all out"}`,
    }));
  }, []);

  const searchStudents = useCallback(async (term: string): Promise<PickOption[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("students")
      .select("id,name,roll_no,class_dept,status")
      .or(studentLookup(term))
      .order("name")
      .limit(8);
    return (data ?? []).map((s) => ({
      id: s.id,
      label: s.name,
      sub: [s.roll_no, s.class_dept].filter(Boolean).join(" · ") || "No roll number",
      disabled: s.status === "blocked",
    }));
  }, []);

  async function submit() {
    if (!book || !student) return;
    setPending(true);
    const res = await reserveBook(book.id, student.id);
    setPending(false);
    if (res.error) {
      toast.error("Couldn't place the hold", res.error);
      return;
    }
    if (res.ready) {
      toast.success("Ready for pickup", `A copy of ${book.label} is waiting for ${student.label}.`);
    } else {
      toast.success(
        "Hold placed",
        `${student.label} is${res.position ? ` #${res.position}` : ""} in the queue for ${book.label}.`
      );
    }
    setBook(null);
    setStudent(null);
    startRefresh(() => router.refresh());
  }

  return (
    <div>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Book</label>
          <AsyncPicker placeholder="Search title or scan barcode…" search={searchBooks} selected={book} onPick={setBook} onClear={() => setBook(null)} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Student</label>
          <AsyncPicker placeholder="Search name or roll no…" search={searchStudents} selected={student} onPick={setStudent} onClear={() => setStudent(null)} />
        </div>
      </div>
      <button type="button" onClick={submit} disabled={!book || !student || pending} className="mt-5 w-full rounded-xl bg-navy-900 px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? "Placing hold…" : "Place hold"}
      </button>
      <p className="mt-3 text-center font-mono text-[0.6rem] uppercase tracking-wider text-ink-mute">
        When a copy is returned, the next student in the queue is flagged ready for pickup
      </p>
    </div>
  );
}
