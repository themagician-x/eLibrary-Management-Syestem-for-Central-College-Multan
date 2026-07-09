"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import DeleteButton from "@/components/DeleteButton";
import TableScroll from "@/components/TableScroll";
import StudentDrawer from "@/components/StudentDrawer";
import type { Student } from "@/lib/types";
import { deleteStudent } from "./actions";

export default function StudentsTable({ students }: { students: Student[] }) {
  const [selected, setSelected] = useState<Student | null>(null);

  return (
    <>
      <TableScroll>
        <div className="sticky top-0 z-10 hidden grid-cols-[1fr_140px_140px_100px_80px] gap-4 border-b border-mist-deep bg-mist px-5 py-3 font-mono text-[0.6rem] uppercase tracking-wider text-ink-mute sm:grid">
          <span>Student</span><span>Roll no</span><span>Class / Dept</span><span>Status</span><span className="text-right">Actions</span>
        </div>
        {students.map((s) => (
          <div
            key={s.id}
            onClick={() => setSelected(s)}
            className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-4 border-b border-mist bg-paper px-5 py-3 transition-colors last:border-0 hover:bg-cream sm:grid-cols-[1fr_140px_140px_100px_80px]"
          >
            <span className="flex min-w-0 items-center gap-3">
              <Avatar name={s.name} src={s.photo_url} size={40} />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-navy-900">{s.name}</span>
                <span className="block truncate text-xs text-ink-mute">{s.email ?? "No email"}</span>
              </span>
            </span>
            <span className="hidden font-mono text-sm text-ink-soft sm:block">{s.roll_no ?? "—"}</span>
            <span className="hidden truncate text-sm text-ink-soft sm:block">{s.class_dept ?? "—"}</span>
            <span className="hidden sm:block">
              <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${s.status === "active" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>{s.status}</span>
            </span>
            <span className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <Link href={`/students/${s.id}/edit`} aria-label={`Edit ${s.name}`} title="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-mute transition-colors hover:bg-mist hover:text-navy-900">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M13.5 6.5l3 3" /></svg>
              </Link>
              <DeleteButton onDelete={() => deleteStudent(s.id)} name={s.name} title="Delete student" />
            </span>
          </div>
        ))}
      </TableScroll>

      <StudentDrawer student={selected} onClose={() => setSelected(null)} />
    </>
  );
}
