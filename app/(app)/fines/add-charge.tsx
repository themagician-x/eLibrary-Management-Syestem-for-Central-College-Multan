"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AsyncPicker, { type PickOption } from "@/components/AsyncPicker";
import { addCharge } from "./actions";

export default function AddCharge() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [student, setStudent] = useState<PickOption | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<"lost" | "damaged">("lost");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);

  const searchStudents = useCallback(async (term: string): Promise<PickOption[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("students")
      .select("id,name,roll_no,class_dept")
      .or(`name.ilike.%${term}%,roll_no.ilike.%${term}%`)
      .order("name")
      .limit(8);
    return (data ?? []).map((s) => ({
      id: s.id,
      label: s.name,
      sub: [s.roll_no, s.class_dept].filter(Boolean).join(" · ") || "No roll number",
    }));
  }, []);

  function submit() {
    if (!student) return;
    setMsg(null);
    start(async () => {
      const res = await addCharge(student.id, Number(amount), reason, note);
      if (res.error) {
        setMsg({ err: res.error });
      } else {
        setMsg({ ok: `Charge added to ${student.label}.` });
        setStudent(null);
        setAmount("");
        setNote("");
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-xl border border-navy-900 px-4 py-2 text-sm font-bold text-navy-900 transition-colors hover:bg-navy-900 hover:text-cream">
        + Add charge
      </button>
    );
  }

  const field = "w-full rounded-xl border border-mist-deep bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25";

  return (
    <div className="rounded-2xl border border-mist-deep bg-paper p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-navy-900">Add a lost / damaged charge</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-ink-mute hover:text-navy-900">Close</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Student</label>
          <AsyncPicker placeholder="Search name or roll no…" search={searchStudents} selected={student} onPick={setStudent} onClear={() => setStudent(null)} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Amount (Rs)</label>
          <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 500" className={field} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Reason</label>
          <select value={reason} onChange={(e) => setReason(e.target.value as "lost" | "damaged")} className={field}>
            <option value="lost">Lost book</option>
            <option value="damaged">Damaged book</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Water damage to cover" className={field} />
        </div>
      </div>
      {msg?.err && <p className="mt-3 rounded-lg bg-danger-soft px-3.5 py-2 text-sm text-danger">{msg.err}</p>}
      {msg?.ok && <p className="mt-3 rounded-lg bg-ok-soft px-3.5 py-2 text-sm text-ok">{msg.ok}</p>}
      <button type="button" onClick={submit} disabled={!student || !amount || pending} className="mt-4 rounded-xl bg-navy-900 px-6 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? "Adding…" : "Add charge"}
      </button>
    </div>
  );
}
