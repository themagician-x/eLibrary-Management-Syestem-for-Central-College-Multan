import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import Avatar from "@/components/Avatar";
import ConfirmDelete from "@/components/ConfirmDelete";
import { createClient } from "@/lib/supabase/server";
import type { Student } from "@/lib/types";
import { deleteStudent } from "../actions";

export const metadata: Metadata = { title: "Student" };

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("students").select("*").eq("id", id).single();
  if (!data) notFound();
  const s = data as Student;

  const meta: [string, string | null][] = [
    ["Roll number", s.roll_no],
    ["Class / Department", s.class_dept],
    ["Email", s.email],
    ["Phone", s.phone],
  ];

  return (
    <PageShell
      title={s.name}
      subtitle={s.class_dept ?? "Student"}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/students" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist">← Students</Link>
          <Link href={`/students/${s.id}/edit`} className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-bold text-cream transition-colors hover:bg-navy-800">Edit</Link>
          <ConfirmDelete onDelete={deleteStudent.bind(null, s.id)} name={s.name} redirectTo="/students" />
        </div>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* identity card */}
        <div className="rounded-2xl border border-mist-deep bg-paper p-6 text-center">
          <div className="mx-auto w-fit">
            <Avatar name={s.name} src={s.photo_url} size={112} />
          </div>
          <h2 className="mt-4 font-display text-xl font-semibold text-navy-900">{s.name}</h2>
          {s.roll_no && <p className="mt-1 font-mono text-sm text-ink-mute">{s.roll_no}</p>}
          <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${s.status === "active" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
            {s.status === "active" ? "Active member" : "Blocked"}
          </span>
        </div>

        {/* details + activity */}
        <div className="space-y-8">
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {meta.map(([k, val]) => (
              <div key={k} className="border-b border-mist pb-3">
                <dt className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">{k}</dt>
                <dd className="mt-1 text-sm font-semibold text-navy-900">{val || <span className="font-normal text-ink-mute/60">—</span>}</dd>
              </div>
            ))}
          </dl>

          {/* borrowing activity — arrives with circulation/fines */}
          <div>
            <h3 className="mb-3 font-display text-base font-semibold text-navy-900">Borrowing activity</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Current loans", note: "M3" },
                { label: "Total borrowed", note: "M3" },
                { label: "Outstanding fines", note: "M4" },
              ].map((x) => (
                <div key={x.label} className="rounded-2xl border border-mist-deep bg-paper p-4">
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ink-mute">{x.label}</p>
                  <p className="mt-2 font-display text-2xl font-semibold text-mist-deep">—</p>
                  <p className="mt-1 font-mono text-[0.55rem] uppercase tracking-wider text-ink-mute/70">arrives in {x.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
