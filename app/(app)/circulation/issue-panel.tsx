"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AsyncPicker, { type PickOption } from "@/components/AsyncPicker";
import { issueBook } from "./actions";

export default function IssuePanel({ loanDays, maxBooks }: { loanDays: number; maxBooks: number }) {
  const router = useRouter();
  const [book, setBook] = useState<PickOption | null>(null);
  const [student, setStudent] = useState<PickOption | null>(null);
  const [pending, setPending] = useState(false);
  const [, startRefresh] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);

  const searchBooks = useCallback(async (term: string): Promise<PickOption[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("books")
      .select("id,title,author,barcode,available_copies")
      .or(`title.ilike.%${term}%,barcode.eq.${term},isbn.eq.${term}`)
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
      .or(`name.ilike.%${term}%,roll_no.ilike.%${term}%`)
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
    setMsg(null);
    setPending(true);
    const res = await issueBook(book.id, student.id);
    setPending(false);
    if (res.error) {
      setMsg({ err: res.error });
      return;
    }
    setMsg({ ok: `“${book.label}” issued to ${student.label}.` });
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
      {msg?.err && <p className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{msg.err}</p>}
      {msg?.ok && <p className="mt-4 rounded-lg border border-ok/20 bg-ok-soft px-3.5 py-2.5 text-sm font-medium text-ok">{msg.ok}</p>}
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
