"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/config";
import type { Student } from "@/lib/types";
import Avatar from "@/components/Avatar";
import DeleteButton from "@/components/DeleteButton";
import StudentCard, { type CardLoan } from "@/components/StudentCard";
import { deleteStudent } from "@/app/(app)/students/actions";

type LoanRow = {
  id: string;
  issued_at: string;
  due_at: string;
  book: { id: string; title: string; author: string | null; barcode: string | null } | null;
};

export default function StudentDrawer({
  student,
  onClose,
}: {
  student: Student | null;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState<Student | null>(null);
  const [shown, setShown] = useState(false);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [totalBorrowed, setTotalBorrowed] = useState<number | null>(null);
  const [fines, setFines] = useState(0);

  // mount / slide transition
  useEffect(() => {
    if (student) {
      setCurrent(student);
      const r = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(r);
    }
    setShown(false);
    const t = setTimeout(() => setCurrent(null), 300);
    return () => clearTimeout(t);
  }, [student]);

  // fetch loans + totals for the opened student
  useEffect(() => {
    if (!student) return;
    let alive = true;
    setLoans([]);
    setTotalBorrowed(null);
    setFines(0);
    const supabase = createClient();
    (async () => {
      const [{ data: loanRows }, { count }, { data: fineRows }] = await Promise.all([
        supabase
          .from("loans")
          .select("id,issued_at,due_at,book:books(id,title,author,barcode)")
          .eq("student_id", student.id)
          .is("returned_at", null)
          .order("due_at", { ascending: true }),
        supabase.from("loans").select("*", { count: "exact", head: true }).eq("student_id", student.id),
        supabase.from("fines").select("amount").eq("student_id", student.id).eq("status", "unpaid"),
      ]);
      if (!alive) return;
      setLoans((loanRows ?? []) as unknown as LoanRow[]);
      setTotalBorrowed(count ?? 0);
      setFines((fineRows ?? []).reduce((sum, r) => sum + Number(r.amount), 0));
    })();
    return () => {
      alive = false;
    };
  }, [student]);

  // esc to close
  useEffect(() => {
    if (!student) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [student, onClose]);

  if (!current) return null;
  const s = current;
  const overdue = loans.filter((l) => new Date(l.due_at).getTime() < Date.now()).length;

  const meta: [string, string | null][] = [
    ["Roll number", s.roll_no],
    ["Class / Dept", s.class_dept],
    ["Email", s.email],
    ["Phone", s.phone],
  ];

  const cardLoans: CardLoan[] = loans.map((l) => ({
    title: l.book?.title ?? "Unknown book",
    barcode: l.book?.barcode ?? null,
    issued_at: l.issued_at,
    due_at: l.due_at,
  }));

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={s.name}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-navy-950/40 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream shadow-[0_0_60px_rgba(5,31,66,0.35)] transition-transform duration-300 ${shown ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-mist-deep px-6 py-5">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold leading-snug text-navy-900">{s.name}</h2>
            <p className="truncate text-sm text-ink-mute">{s.class_dept ?? "Student"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-ink-mute transition-colors hover:bg-mist hover:text-navy-900"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* body */}
        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-5">
          {/* identity */}
          <div className="flex flex-col items-center">
            <Avatar name={s.name} src={s.photo_url} size={96} />
            <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${s.status === "active" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
              {s.status === "active" ? "Active member" : "Blocked"}
            </span>
          </div>

          {/* meta */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            {meta.map(([k, val]) => (
              <div key={k} className="border-b border-mist pb-3">
                <dt className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">{k}</dt>
                <dd className="mt-1 truncate text-sm font-semibold text-navy-900">{val || <span className="font-normal text-ink-mute/60">—</span>}</dd>
              </div>
            ))}
          </dl>

          {/* activity tiles */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-mist-deep bg-paper p-3 text-center">
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-ink-mute">On loan</p>
              <p className="mt-1 font-display text-xl font-semibold text-navy-900">{loans.length}</p>
            </div>
            <div className={`rounded-xl border p-3 text-center ${overdue ? "border-danger/30 bg-danger-soft" : "border-mist-deep bg-paper"}`}>
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-ink-mute">Overdue</p>
              <p className={`mt-1 font-display text-xl font-semibold ${overdue ? "text-danger" : "text-navy-900"}`}>{overdue}</p>
            </div>
            <div className={`rounded-xl border p-3 text-center ${fines > 0 ? "border-danger/30 bg-danger-soft" : "border-mist-deep bg-paper"}`}>
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-ink-mute">Fines</p>
              <p className={`mt-1 font-display text-base font-semibold ${fines > 0 ? "text-danger" : "text-navy-900"}`}>{money(fines)}</p>
            </div>
          </div>

          {/* current loans */}
          <div>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">
              Books on loan {totalBorrowed !== null && `· ${totalBorrowed} all-time`}
            </p>
            {loans.length === 0 ? (
              <p className="rounded-xl border border-dashed border-mist-deep bg-paper px-4 py-5 text-center text-sm text-ink-mute">No books currently on loan.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-mist-deep">
                {loans.map((l) => {
                  const isOverdue = new Date(l.due_at).getTime() < Date.now();
                  return (
                    <div key={l.id} className="flex items-center justify-between gap-3 border-b border-mist bg-paper px-4 py-2.5 last:border-0">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-navy-900">{l.book?.title ?? "Unknown book"}</span>
                        <span className="block truncate font-mono text-[0.65rem] text-ink-mute">{l.book?.barcode ?? ""}</span>
                      </span>
                      <span className={`flex-none rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold ${isOverdue ? "bg-danger text-white" : "bg-mist text-ink-soft"}`}>
                        Due {new Date(l.due_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* library card */}
          <StudentCard student={s} loans={cardLoans} />
        </div>

        {/* footer actions */}
        <div className="flex items-center gap-2 border-t border-mist-deep px-6 py-4">
          <Link
            href={`/students/${s.id}/edit`}
            onClick={onClose}
            className="flex-1 rounded-xl bg-navy-900 px-4 py-2.5 text-center text-sm font-bold text-cream transition-colors hover:bg-navy-800"
          >
            Edit student
          </Link>
          <DeleteButton onDelete={() => deleteStudent(s.id)} name={s.name} title="Delete student" onDeleted={onClose} />
        </div>
      </div>
    </div>
  );
}
