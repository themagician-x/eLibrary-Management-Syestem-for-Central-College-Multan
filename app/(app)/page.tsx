import Link from "next/link";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";

const roadmap = [
  { m: "M1", title: "Catalogue", desc: "Books CRUD, covers, QR/barcode, CSV import" },
  { m: "M2", title: "Students", desc: "Student profiles with photo & history" },
  { m: "M3", title: "Circulation", desc: "Issue / return, 14-day due dates, overdue" },
  { m: "M4", title: "Fines", desc: "Auto late fees, pay / waive" },
  { m: "M5", title: "Reservations", desc: "Hold queue + auto-notify" },
  { m: "M6", title: "Emails + Cron", desc: "Issue / due / overdue reminders" },
];

export default async function Dashboard() {
  const supabase = await createClient();
  const { count: bookCount } = await supabase
    .from("books")
    .select("*", { count: "exact", head: true });

  const stats = [
    { label: "Total books", value: bookCount ?? 0, note: "M1", href: "/books" },
    { label: "Registered students", value: "—", note: "M2", href: "/students" },
    { label: "Books issued", value: "—", note: "M3", href: "/circulation" },
    { label: "Overdue", value: "—", note: "M3", href: "/circulation" },
  ];

  return (
    <PageShell
      title="Dashboard"
      subtitle="Welcome to the Central College Library system."
    >
      {/* M0 status banner */}
      <div className="crest-lines mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-navy-950 p-6">
        <div>
          <p className="eyebrow" style={{ color: "var(--color-gold-400)" }}>
            Milestone M0 · Foundation
          </p>
          <p className="mt-2 max-w-xl font-display text-xl font-semibold text-cream">
            You&rsquo;re connected. The groundwork is live.
          </p>
          <p className="mt-1.5 text-sm text-navy-100/70">
            Admin login, secure session, and the app shell are in place. Next up
            is the book catalogue.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-ok-soft px-3.5 py-1.5 text-xs font-bold text-ok">
          <span className="h-2 w-2 rounded-full bg-ok" />
          Online
        </span>
      </div>

      {/* stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-2xl border border-mist-deep bg-paper p-5 transition-all hover:-translate-y-0.5 hover:border-gold-500/60 hover:shadow-[0_12px_30px_rgba(5,31,66,0.08)]"
          >
            <div className="flex items-start justify-between">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ink-mute">
                {s.label}
              </span>
              <span className="rounded-full bg-mist px-1.5 py-0.5 font-mono text-[0.55rem] tracking-wider text-ink-mute">
                {s.note}
              </span>
            </div>
            <p className="mt-3 font-display text-4xl font-semibold tabular-nums text-navy-900">
              {s.value}
            </p>
          </Link>
        ))}
      </div>

      {/* roadmap */}
      <h2 className="mb-4 mt-12 font-display text-lg font-semibold text-navy-900">
        What&rsquo;s next
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roadmap.map((r) => (
          <div
            key={r.m}
            className="rounded-2xl border border-mist-deep bg-paper p-5"
          >
            <span className="font-mono text-xs font-semibold text-gold-700">
              {r.m}
            </span>
            <p className="mt-1 font-display text-base font-semibold text-navy-900">
              {r.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-mute">{r.desc}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
