"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AsyncPicker, { type PickOption } from "@/components/AsyncPicker";
import { reserveBook } from "./actions";

export default function ReservePanel() {
  const router = useRouter();
  const [book, setBook] = useState<PickOption | null>(null);
  const [student, setStudent] = useState<PickOption | null>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);

  const searchBooks = useCallback(async (term: string): Promise<PickOption[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("books")
      .select("id,title,author,available_copies,barcode")
      .or(`title.ilike.%${term}%,barcode.eq.${term}`)
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

  function submit() {
    if (!book || !student) return;
    setMsg(null);
    start(async () => {
      const res = await reserveBook(book.id, student.id);
      if (res.error) {
        setMsg({ err: res.error });
      } else {
        setMsg({ ok: `${student.label} reserved “${book.label}”${res.position ? ` — #${res.position} in queue` : ""}.` });
        setBook(null);
        setStudent(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="crest-lines rounded-2xl bg-navy-950 p-6">
      <p className="eyebrow" style={{ color: "var(--color-gold-400)" }}>Place a hold</p>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-start">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-navy-100/70">Book</label>
          <AsyncPicker placeholder="Search title or scan barcode…" search={searchBooks} selected={book} onPick={setBook} onClear={() => setBook(null)} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-navy-100/70">Student</label>
          <AsyncPicker placeholder="Search name or roll no…" search={searchStudents} selected={student} onPick={setStudent} onClear={() => setStudent(null)} />
        </div>
        <div className="md:pt-6">
          <button type="button" onClick={submit} disabled={!book || !student || pending} className="w-full rounded-xl bg-gold-500 px-6 py-2.5 text-sm font-bold text-navy-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto">
            {pending ? "Reserving…" : "Reserve"}
          </button>
        </div>
      </div>
      {msg?.err && <p className="mt-3 rounded-lg bg-danger-soft px-3.5 py-2 text-sm font-medium text-danger">{msg.err}</p>}
      {msg?.ok && <p className="mt-3 rounded-lg bg-ok-soft px-3.5 py-2 text-sm font-medium text-ok">{msg.ok}</p>}
      <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-wider text-navy-100/45">
        When a copy is returned, the next student in the queue is flagged ready for pickup
      </p>
    </div>
  );
}
