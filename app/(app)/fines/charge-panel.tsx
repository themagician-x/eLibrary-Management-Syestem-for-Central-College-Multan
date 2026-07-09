"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/config";
import AsyncPicker, { type PickOption } from "@/components/AsyncPicker";
import Select from "@/components/Select";
import { addCharge } from "./actions";

const field =
  "w-full rounded-xl border border-mist-deep bg-cream px-4 py-2.5 text-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25";

export default function ChargePanel() {
  const router = useRouter();
  const [student, setStudent] = useState<PickOption | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<"lost" | "damaged">("lost");
  const [note, setNote] = useState("");
  // the refresh runs in its own transition so React paints the success message
  // straight away instead of deferring it until the router settles
  const [pending, setPending] = useState(false);
  const [, startRefresh] = useTransition();
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

  async function submit() {
    if (!student || !amount) return;
    setMsg(null);
    setPending(true);
    const res = await addCharge(student.id, Number(amount), reason, note);
    setPending(false);
    if (res.error) {
      setMsg({ err: res.error });
      return;
    }
    setMsg({ ok: `${money(Number(amount))} ${reason} charge added to ${student.label}.` });
    setStudent(null);
    setAmount("");
    setNote("");
    startRefresh(() => router.refresh());
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Student</label>
          <AsyncPicker placeholder="Search name or roll no…" search={searchStudents} selected={student} onPick={setStudent} onClear={() => setStudent(null)} />
        </div>
        <div>
          <label htmlFor="amount" className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Amount (Rs)</label>
          <input id="amount" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 500" className={field} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Reason</label>
          <Select
            ariaLabel="Reason"
            value={reason}
            onChange={(v) => setReason(v as "lost" | "damaged")}
            buttonClassName="w-full rounded-xl border bg-cream px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-gold-500/25"
            options={[
              { value: "lost", label: "Lost book" },
              { value: "damaged", label: "Damaged book" },
            ]}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="note" className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Note (optional)</label>
          <input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Water damage to cover" className={field} />
        </div>
      </div>

      {msg?.err && <p className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{msg.err}</p>}
      {msg?.ok && <p className="mt-4 rounded-lg border border-ok/20 bg-ok-soft px-3.5 py-2.5 text-sm font-medium text-ok">{msg.ok}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!student || !amount || pending}
        className="mt-5 w-full rounded-xl bg-navy-900 px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add charge"}
      </button>
      <p className="mt-3 text-center font-mono text-[0.6rem] uppercase tracking-wider text-ink-mute">
        Overdue fines are added automatically — use this for lost or damaged books
      </p>
    </div>
  );
}
