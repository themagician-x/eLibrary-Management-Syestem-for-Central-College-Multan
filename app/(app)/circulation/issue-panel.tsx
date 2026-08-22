"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { studentLookup, bookLookup } from "@/lib/search";
import { useToast } from "@/components/Toast";
import AsyncPicker, { type PickOption } from "@/components/AsyncPicker";
import { issueBook } from "./actions";

export default function IssuePanel({ loanDays, maxBooks }: { loanDays: number; maxBooks: number }) {
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
      .select("id,title,author,barcode,available_copies")
      .or(bookLookup(term))
      .order("title")
      .limit(8);
    return (data ?? []).map((b) => ({
      id: b.id,
      label: b.title,
      sub: `${b.author ?? "Unknown"} · ${b.available_copies} available`,
      disabled: b.available_copies < 1,
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
    const res = await issueBook(book.id, student.id);
    setPending(false);
    if (res.error) {
      toast.error("Couldn't issue the book", res.error);
      return;
    }
    toast.success("Book issued", `${book.label} is now on loan to ${student.label}.`);
    setBook(null);
    setStudent(null);
    startRefresh(() => router.refresh());
  }

  return (
    <div>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Book</label>
          <AsyncPicker placeholder="Scan barcode or search title…" search={searchBooks} selected={book} onPick={setBook} onClear={() => setBook(null)} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Student</label>
          <AsyncPicker placeholder="Search name or roll no…" search={searchStudents} selected={student} onPick={setStudent} onClear={() => setStudent(null)} />
        </div>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={!book || !student || pending}
        className="mt-5 w-full rounded-xl bg-navy-900 px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Issuing…" : "Issue book"}
      </button>
      <p className="mt-3 text-center font-mono text-[0.6rem] uppercase tracking-wider text-ink-mute">
        {loanDays}-day loan · max {maxBooks} books per student · scan a QR label to auto-select
      </p>
    </div>
  );
}
