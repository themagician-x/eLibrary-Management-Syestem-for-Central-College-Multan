import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/config";

export const metadata: Metadata = { title: "Guide" };

/* ---------- small building blocks, local to the guide ---------- */

function Section({
  id,
  n,
  title,
  lead,
  children,
}: {
  id: string;
  n: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 rounded-2xl border border-mist-deep bg-paper p-6">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[0.7rem] font-semibold text-gold-700">{n}</span>
        <h2 className="font-display text-xl font-semibold text-navy-900">{title}</h2>
      </div>
      {lead && <p className="mt-1.5 max-w-prose text-sm text-ink-soft">{lead}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/** A numbered procedure — for things done in a fixed order. */
function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((text, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-5 w-5 flex-none items-center justify-center rounded-md bg-navy-900 font-mono text-[0.62rem] font-bold text-cream">
            {i + 1}
          </span>
          <span className="text-sm leading-relaxed text-ink-soft">{text}</span>
        </li>
      ))}
    </ol>
  );
}

function Note({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" }) {
  const cls =
    tone === "warn"
      ? "border-warn/25 bg-warn-soft text-warn"
      : "border-navy-600/20 bg-navy-100/40 text-ink-soft";
  return (
    <p className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${cls}`}>{children}</p>
  );
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y divide-mist overflow-hidden rounded-xl border border-mist-deep">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
          <dt className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-ink-mute sm:pt-0.5">{k}</dt>
          <dd className="text-sm text-ink-soft">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const CONTENTS: [string, string][] = [
  ["signing-in", "Signing in"],
  ["desk", "The desk in 30 seconds"],
  ["books", "Books"],
  ["students", "Students"],
  ["circulation", "Circulation"],
  ["reservations", "Reservations"],
  ["fines", "Fines"],
  ["lost", "Lost & damaged"],
  ["reports", "Reports"],
  ["settings", "Settings"],
  ["finding", "Finding things"],
  ["rules", "What the system won't let you do"],
  ["printing", "Cards, labels & scanners"],
];

export default async function GuidePage() {
  // quote the library's own rules rather than defaults
  const { loan_days, max_books, max_renews, fine_per_day } = await getSettings();

  return (
    <PageShell
      title="Guide"
      subtitle="How to run the library from this system, start to finish."
    >
      {/* contents */}
      <nav aria-label="Contents" className="rounded-2xl border border-mist-deep bg-mist/50 p-5">
        <p className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">
          On this page
        </p>
        <ol className="-my-1 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
          {CONTENTS.map(([id, label], i) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="group flex items-baseline gap-2 py-1.5 text-sm text-ink-soft transition-colors hover:text-navy-900"
              >
                <span className="font-mono text-[0.62rem] text-gold-700">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="group-hover:underline">{label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-5 space-y-5">
        <Section
          id="signing-in"
          n="01"
          title="Signing in"
          lead="One admin account runs the whole system. Students never log in — they are records you manage, not users."
        >
          <Facts
            rows={[
              ["Who can sign in", "The single library admin account."],
              ["Wrong password", "Three attempts are free. After that the account locks for 30 seconds, then 1, 2, 5, 15 and 30 minutes, then an hour."],
              ["Locked out", "The Sign in button shows a live countdown and re-enables itself. Waiting is the only way through — clearing cookies does nothing, the lock is held on the server."],
              ["Signing out", "Bottom of the sidebar."],
            ]}
          />
        </Section>

        <Section
          id="desk"
          n="02"
          title="The desk in 30 seconds"
          lead="The two things you do most. Everything else in this guide is detail around these."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-mist-deep p-4">
              <p className="mb-3 font-display font-semibold text-navy-900">Lending a book out</p>
              <Steps
                items={[
                  <>Go to <b className="text-navy-900">Circulation → + Issue a book</b>.</>,
                  <>Scan the book&rsquo;s barcode label, or type the title.</>,
                  <>Scan the student&rsquo;s card, or type their name or roll number.</>,
                  <>Press <b className="text-navy-900">Issue book</b>. The due date is set automatically.</>,
                ]}
              />
            </div>
            <div className="rounded-xl border border-mist-deep p-4">
              <p className="mb-3 font-display font-semibold text-navy-900">Taking a book back</p>
              <Steps
                items={[
                  <>Go to <b className="text-navy-900">Circulation</b>.</>,
                  <>Find the loan — search or scan.</>,
                  <>Press <b className="text-navy-900">Return</b>.</>,
                  <>If it is late, the fine is worked out and charged for you. The confirmation tells you the amount.</>,
                ]}
              />
            </div>
          </div>
          <Note>
            Every action confirms itself with a message in the bottom-right corner naming what
            happened — &ldquo;Book returned&rdquo;, &ldquo;Rs 200 late fee charged&rdquo;. If you
            do not see one, the action did not go through.
          </Note>
        </Section>

        <Section
          id="books"
          n="03"
          title="Books"
          lead="The catalogue. A book record covers every copy the library owns of that title."
        >
          <Facts
            rows={[
              ["Adding one", <>Books → <b>+ Add book</b>. Only the title is required.</>],
              ["Copies", "Set how many physical copies you own. The system works out how many are free by subtracting the ones currently on loan — you never edit that number yourself."],
              ["Category", "Pick from the list or type your own. A new category is offered as an option for every book you add afterwards."],
              ["Barcode", "Generated automatically. Print the label from the book's page and stick it inside the cover."],
              ["Cover image", "Optional. Upload one from the book form."],
              ["Bulk import", <>Books → <b>Import CSV</b>. Download the template first.</>],
              ["Editing", "Pencil icon on the row, or Edit on the book's page."],
            ]}
          />
          <div>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">
              CSV import
            </p>
            <p className="text-sm leading-relaxed text-ink-soft">
              A header row is required; only <b className="text-navy-900">title</b> matters, the
              rest are optional. Recognised columns:{" "}
              <span className="font-mono text-xs">
                title · author · isbn · publisher · year · category · language · shelf · copies
              </span>
              . Rows whose ISBN is already in the catalogue are skipped rather than duplicated, and
              the result tells you how many were imported and how many were passed over. Up to
              5,000 rows per file.
            </p>
          </div>
        </Section>

        <Section
          id="students"
          n="04"
          title="Students"
          lead="Records of who may borrow. Click any student anywhere in the system to open their full record."
        >
          <Facts
            rows={[
              ["Registering", <>Students → <b>+ Add student</b>. Only the name is required, but a roll number is what you will search and scan by.</>],
              ["Their record", "Click a student's name — in any table — to open a panel with everything: books on loan, how overdue each is, what they owe against what they have paid, every charge with its reasoning, active holds, and their returns marked on-time or late."],
              ["Blocking", "Set status to Blocked on the student form. A blocked student cannot be issued anything — they appear in the picker marked unavailable."],
              ["Library card", "At the bottom of their record. See section 13."],
              ["No photographs", "Students are identified by name and roll number. The system deliberately stores no photos."],
            ]}
          />
        </Section>

        <Section
          id="circulation"
          n="05"
          title="Circulation"
          lead="Everything currently out on loan. This is the page you will live on."
        >
          <Facts
            rows={[
              ["Issue", <>Sets the due date {loan_days} days ahead, from Settings.</>],
              ["Return", "Closes the loan, puts the copy back on the shelf, and charges a late fee if it is overdue."],
              ["Renew", <>Extends the loan by another {loan_days} days. Allowed {max_renews} time{max_renews === 1 ? "" : "s"} per loan, then the button disappears.</>],
              ["Lost / Damaged", <>For a book that is not coming back. See <a href="#lost" className="font-semibold text-navy-700 underline-offset-2 hover:underline">section 08</a>.</>],
              ["Overdue tab", "Filters to loans past their due date. The count next to it is the whole library, not just this page."],
              ["Due column", "Counts down — Due in 5d, Due today, then 3d overdue in red."],
            ]}
          />
          <Note>
            A book can be on loan to several students at once if you own several copies. Each row
            is one copy with one borrower, so the same title appearing twice is normal.
          </Note>
        </Section>

        <Section
          id="reservations"
          n="06"
          title="Reservations"
          lead="Holds for books that are out, so the next student in line gets them."
        >
          <Facts
            rows={[
              ["Placing a hold", <>Reservations → <b>+ Place a hold</b>.</>],
              ["Ready straight away", "If a copy is free when the hold is placed, it is marked Ready for pickup immediately rather than queued."],
              ["Queue position", "Otherwise the student joins the queue and the position is shown — 1st, 2nd and so on, per book."],
              ["When a copy comes back", "Returning a book automatically promotes the longest-waiting hold to Ready."],
              ["Handing it over", <>Press <b>Issue</b> on a Ready hold — it issues the book and closes the hold in one step.</>],
              ["Cancelling", "Cancel removes the hold and moves everyone behind up the queue."],
              ["History tab", "Fulfilled and cancelled holds."],
            ]}
          />
        </Section>

        <Section
          id="fines"
          n="07"
          title="Fines"
          lead="Late fees are raised automatically. Replacement charges you raise yourself."
        >
          <Facts
            rows={[
              ["Late fees", <>Charged on return, at {money(fine_per_day)} per day overdue. Nothing to do by hand.</>],
              ["Adding a charge", <>Fines → <b>+ Add charge</b>, for a lost or damaged book. Pick the book so the charge says what it was for.</>],
              ["Seeing the reasoning", "Click any row. The panel shows the student, the book, the dates, and the arithmetic behind the amount."],
              ["Mark paid", "When the student pays at the desk."],
              ["Waive", "Cancels the charge without payment, keeping the record."],
              ["Undo", "Puts a paid or waived charge back to unpaid."],
              ["Tabs", "Unpaid, Paid, Waived, All. Outstanding and Collected totals sit at the top."],
            ]}
          />
          <div className="rounded-xl border border-mist-deep bg-cream p-4">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">
              How a late fee is worked out
            </p>
            <p className="mt-2 font-mono text-sm font-semibold text-gold-700">
              days past the due date × {money(fine_per_day)} per day
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              A book due 23 Jul and returned 27 Jul is 4 days late, so at{" "}
              {money(fine_per_day)} a day the charge is {money(fine_per_day * 4)}. Every charge
              records the rate it was actually calculated at, so changing the rate in Settings never
              rewrites an old fine.
            </p>
          </div>
        </Section>

        <Section
          id="lost"
          n="08"
          title="Lost & damaged"
          lead="When a copy is never coming back, it has to leave the inventory — otherwise your shelf count stays wrong forever."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-mist-deep p-4">
              <p className="mb-2 font-display font-semibold text-navy-900">
                A student lost it
              </p>
              <p className="text-sm leading-relaxed text-ink-soft">
                Use <b className="text-navy-900">Lost / Damaged</b> on the loan in Circulation. It
                closes the loan, removes one copy from the inventory, and charges the replacement
                cost to the student — all in one step.
              </p>
            </div>
            <div className="rounded-xl border border-mist-deep p-4">
              <p className="mb-2 font-display font-semibold text-navy-900">
                A shelf copy is damaged
              </p>
              <p className="text-sm leading-relaxed text-ink-soft">
                Use <b className="text-navy-900">Lost / Damaged</b> on the book&rsquo;s own page.
                One copy leaves the inventory and nobody is charged. The button is disabled when
                every copy is out on loan.
              </p>
            </div>
          </div>
          <Note>
            Written-off copies are listed on the book&rsquo;s page and on Reports, with the reason,
            who was charged, and any note you added. Nothing is silently deleted.
          </Note>
        </Section>

        <Section
          id="reports"
          n="09"
          title="Reports"
          lead="A snapshot of the library, read straight from live data."
        >
          <Facts
            rows={[
              ["Headline numbers", "Titles, students, loans all-time, on loan now, overdue, outstanding fines, fines collected, and copies written off."],
              ["Most borrowed", "Top titles by number of loans ever."],
              ["Books by category", "How the collection is distributed."],
              ["Lost & damaged", "Every retired copy, with the reason and what was charged. Books and students here open their records."],
            ]}
          />
        </Section>

        <Section
          id="settings"
          n="10"
          title="Settings"
          lead="The four rules the whole system runs on. Changing one affects new loans, not ones already out."
        >
          <Facts
            rows={[
              ["Loan period", <><b className="text-navy-900">{loan_days} days</b> — how long a book can be borrowed before it is due.</>],
              ["Books per student", <><b className="text-navy-900">{max_books}</b> — the most a student may hold at once.</>],
              ["Renewals allowed", <><b className="text-navy-900">{max_renews}</b> — how many times one loan can be extended.</>],
              ["Fine rate", <><b className="text-navy-900">{money(fine_per_day)} per day</b> — charged for each day a book is overdue.</>],
            ]}
          />
          <Note tone="warn">
            Books already on loan keep the due date they were given. A new rate only applies to
            fines raised after the change.
          </Note>
        </Section>

        <Section
          id="finding"
          n="11"
          title="Finding things"
          lead="Search and filters work the same way on every list — and one shortcut reaches everything at once."
        >
          <Facts
            rows={[
              [
                "Quick search",
                "Press Cmd + K (Ctrl + K on Windows) anywhere in the app for a search box over the page. Type part of a title, a name, a roll number or a barcode and results appear as you type. Arrow keys move, Enter opens, Escape closes. It also jumps to any page and starts any common job — issuing a book, adding a student, raising a fine.",
              ],
              ["Searching", "Type and the list narrows as you go — no button to press."],
              ["Several at once", "Separate terms with commas to search for up to five at a time: “Ahmed, Fatima, Bilal” finds all three. More than five and it will tell you."],
              ["Filters", "The dropdowns beside the search box narrow further and combine with it."],
              ["Clear", "Appears once anything is active; resets everything."],
              ["Pages", "Fifty rows a page. The count beside the page title is the whole set, not the page. Searching returns you to page one."],
              ["Scanning", "Scanning a barcode into a search box works exactly like typing it."],
            ]}
          />
        </Section>

        <Section
          id="rules"
          n="12"
          title="What the system won't let you do"
          lead="These are refused by the database itself, so they hold no matter how the action is attempted. If you see one of these messages, it is protecting a record."
        >
          <Facts
            rows={[
              ["Issue with no copies free", "Every copy is already out. Place a hold instead."],
              ["Issue to a blocked student", "Unblock them on the student form first."],
              ["Issue the same title twice to one student", "They already have a copy."],
              ["Issue past the limit", <>A student may hold {max_books} book{max_books === 1 ? "" : "s"} at once.</>],
              ["Renew past the limit", <>{max_renews} renewal{max_renews === 1 ? "" : "s"} per loan.</>],
              ["Delete a student who owes money", "Collect or waive the fines first — otherwise the debt would vanish with the record."],
              ["Delete a student holding books", "Take the books back, or write them off."],
              ["Delete a book that is out", "Its copies must be returned or written off first."],
              ["Write off a shelf copy with none on the shelf", "Do it from the loan in Circulation instead."],
            ]}
          />
        </Section>

        <Section
          id="printing"
          n="13"
          title="Cards, labels & scanners"
          lead="The two things you print, and the one piece of hardware worth buying."
        >
          <Facts
            rows={[
              ["Student library card", "At the bottom of a student's record. Prints at true ID-1 size — set your printer to 100% / Actual size, not Fit to page, or it comes out wrong."],
              ["What is on the card", "Name, roll number, class, join date, the college mark, and a QR holding the roll number. Nothing that can change — borrowed books and borrowing status are read from this system, never from the card."],
              ["Book label", "On each book's page. Print it and stick it inside the front cover."],
              ["Scanner", "Any inexpensive USB barcode scanner works. They type what they read, so no setup is needed — click into a search box and scan."],
              ["The desk flow", "Scan the card to find the student, scan the label to find the book. No typing."],
            ]}
          />
          <Note tone="warn">
            A card never needs updating. If a student is blocked or owes money, the system shows
            that when you scan them in — the card itself stays valid for their whole membership.
          </Note>
        </Section>

        <div className="rounded-2xl border border-mist-deep bg-navy-900 p-6 text-cream">
          <p className="font-display text-lg font-semibold">One rule to remember</p>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-navy-100">
            The system is the record. Cards, labels and printouts only ever point at it — they never
            hold information of their own. If you are ever unsure whether something is true, look it
            up here rather than on paper.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/circulation" className="rounded-xl bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950 transition-colors hover:bg-gold-400">
              Go to Circulation
            </Link>
            <Link href="/settings" className="rounded-xl border border-cream/30 px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-cream/10">
              Review the rules
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
