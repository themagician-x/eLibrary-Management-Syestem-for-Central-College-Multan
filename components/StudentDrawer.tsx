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

type Activity = {
  studentId: string;
  loans: LoanRow[];
  totalBorrowed: number;
  fines: number;
};

const day = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
const isOverdue = (dueAt: string) => new Date(dueAt).getTime() < Date.now();

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">{children}</p>;
}

export default function StudentDrawer({
  student,
  onClose,
}: {
  student: Student | null;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState<Student | null>(null);
  const [shown, setShown] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);

  // mount / slide transition (keep `current` while animating out)
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
    const id = student.id;
    const supabase = createClient();
    (async () => {
      const [{ data: loanRows }, { count }, { data: fineRows }] = await Promise.all([
        supabase
          .from("loans")
          .select("id,issued_at,due_at,book:books(id,title,author,barcode)")
          .eq("student_id", id)
          .is("returned_at", null)
          .order("due_at", { ascending: true }),
        supabase.from("loans").select("*", { count: "exact", head: true }).eq("student_id", id),
        supabase.from("fines").select("amount").eq("student_id", id).eq("status", "unpaid"),
      ]);
      if (!alive) return;
      setActivity({
        studentId: id,
        loans: (loanRows ?? []) as unknown as LoanRow[],
        totalBorrowed: count ?? 0,
        fines: (fineRows ?? []).reduce((sum, r) => sum + Number(r.amount), 0),
      });
    })();
    return () => {
      alive = false;
    };
  }, [student]);

  // esc to close (background scroll is left untouched so the sticky sidebar
  // doesn't jump; the drawer contains its own scroll instead)
  useEffect(() => {
    if (!student) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [student, onClose]);

  if (!current) return null;
  const s = current;

  // keyed by id so the previous student's numbers never show under a new name
  const data = activity?.studentId === s.id ? activity : null;
  const loans = data?.loans ?? [];
  const overdue = loans.filter((l) => isOverdue(l.due_at)).length;
  const active = s.status === "active";

  const cardLoans: CardLoan[] = loans.map((l) => ({
    title: l.book?.title ?? "Unknown book",
    barcode: l.book?.barcode ?? null,
    issued_at: l.issued_at,
    due_at: l.due_at,
  }));

  const details: { k: string; v: React.ReactNode }[] = [
    { k: "Class / Dept", v: s.class_dept },
    {
      k: "Email",
      v: s.email && (
        <a href={`mailto:${s.email}`} className="break-all text-navy-700 underline-offset-2 hover:underline">
          {s.email}
        </a>
      ),
    },
    {
      k: "Phone",
      v: s.phone && (
        <a href={`tel:${s.phone}`} className="text-navy-700 underline-offset-2 hover:underline">
          {s.phone}
        </a>
      ),
    },
    {
      k: "Member since",
      v: new Date(s.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    },
  ];

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={s.name}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-navy-950/40 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream shadow-[0_0_60px_rgba(5,31,66,0.35)] transition-transform duration-300 ${shown ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* header — identity stays visible while the body scrolls */}
        <div className="flex items-start gap-3 border-b border-mist-deep px-6 py-5">
          <Avatar name={s.name} src={s.photo_url} size={52} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-lg font-semibold leading-snug text-navy-900">{s.name}</h2>
            <p className="truncate font-mono text-xs text-ink-mute">{s.roll_no ?? "No roll number"}</p>
            <span
              className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold ${active ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-ok" : "bg-danger"}`} />
              {active ? "Active member" : "Blocked"}
            </span>
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
          {/* activity tiles — the overdue and fines tiles jump to the work */}
          <div className="grid grid-cols-3 gap-3">
            <Tile label="On loan" value={loans.length} loading={!data} />
            <Tile
              label="Overdue"
              value={overdue}
              loading={!data}
              tone={overdue ? "danger" : undefined}
              href={overdue ? "/circulation?filter=overdue" : undefined}
              onNavigate={onClose}
            />
            <Tile
              label="Fines"
              value={money(data?.fines ?? 0)}
              dense
              loading={!data}
              tone={data && data.fines > 0 ? "danger" : undefined}
              href={data && data.fines > 0 ? "/fines" : undefined}
              onNavigate={onClose}
            />
          </div>

          {/* contact + enrolment */}
          <div>
            <SectionLabel>Details</SectionLabel>
            <dl className="divide-y divide-mist overflow-hidden rounded-xl border border-mist-deep bg-paper">
              {details.map(({ k, v }) => (
                <div key={k} className="flex items-start justify-between gap-4 px-4 py-2.5">
                  <dt className="flex-none pt-0.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink-mute">{k}</dt>
                  <dd className="min-w-0 text-right text-sm font-semibold text-navy-900">
                    {v || <span className="font-normal text-ink-mute/60">—</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* current loans */}
          <div>
            <SectionLabel>
              Books on loan{data ? ` · ${data.totalBorrowed} borrowed all-time` : ""}
            </SectionLabel>
            {!data ? (
              <div className="space-y-2">
                <div className="h-14 animate-pulse rounded-xl bg-mist" />
                <div className="h-14 animate-pulse rounded-xl bg-mist" />
              </div>
            ) : loans.length === 0 ? (
              <p className="rounded-xl border border-dashed border-mist-deep bg-paper px-4 py-5 text-center text-sm text-ink-mute">
                No books currently on loan.
              </p>
            ) : (
              <div className="space-y-2">
                {loans.map((l) => {
                  const late = isOverdue(l.due_at);
                  return (
                    <div
                      key={l.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border bg-paper px-4 py-2.5 ${late ? "border-danger/30 bg-danger-soft/40" : "border-mist-deep"}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-navy-900">{l.book?.title ?? "Unknown book"}</span>
                        <span className="block truncate text-xs text-ink-mute">
                          {l.book?.author ?? "Unknown author"}
                          {l.book?.barcode ? <span className="font-mono"> · {l.book.barcode}</span> : null}
                        </span>
                      </span>
                      <span className="flex-none text-right">
                        <span className={`block rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold ${late ? "bg-danger text-white" : "bg-mist text-ink-soft"}`}>
                          {late ? "Overdue" : `Due ${day(l.due_at)}`}
                        </span>
                        <span className="mt-1 block text-[0.65rem] text-ink-mute">Issued {day(l.issued_at)}</span>
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

function Tile({
  label,
  value,
  loading,
  tone,
  dense,
  href,
  onNavigate,
}: {
  label: string;
  value: React.ReactNode;
  loading?: boolean;
  tone?: "danger";
  /** for money, which is wider than a bare count */
  dense?: boolean;
  href?: string;
  onNavigate?: () => void;
}) {
  const danger = tone === "danger";
  const body = (
    <>
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-ink-mute">{label}</p>
      {loading ? (
        <span className="mx-auto mt-1.5 block h-5 w-8 animate-pulse rounded bg-mist-deep" />
      ) : (
        <p className={`mt-1 truncate font-display font-semibold ${dense ? "text-base" : "text-xl"} ${danger ? "text-danger" : "text-navy-900"}`}>{value}</p>
      )}
    </>
  );

  const cls = `block rounded-xl border p-3 text-center ${danger ? "border-danger/30 bg-danger-soft" : "border-mist-deep bg-paper"}`;

  if (!href) return <div className={cls}>{body}</div>;
  return (
    <Link href={href} onClick={onNavigate} className={`${cls} transition-colors hover:border-navy-600`}>
      {body}
    </Link>
  );
}
