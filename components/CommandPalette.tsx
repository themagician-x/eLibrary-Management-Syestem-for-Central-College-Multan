"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { bookLookup, studentLookup } from "@/lib/search";
import { nav } from "@/lib/nav";
import { initials } from "@/components/Avatar";
import BookDrawer from "@/app/(app)/books/book-drawer";
import StudentDrawer from "@/components/StudentDrawer";
import type { Book, Student } from "@/lib/types";

/** Things worth doing that are not a page in the sidebar. */
const ACTIONS = [
  { href: "/circulation/issue", label: "Issue a book", sub: "Lend a copy to a student" },
  { href: "/books/new", label: "Add a book", sub: "New title in the catalogue" },
  { href: "/students/new", label: "Add a student", sub: "New borrower record" },
  { href: "/fines/new", label: "Raise a fine", sub: "Charge a student by hand" },
  { href: "/reservations/new", label: "Place a hold", sub: "Reserve a title for a student" },
];

const PAGES = nav.map((n) => ({ href: n.href, label: n.label, sub: "", icon: n.icon }));

type Item = { key: string; group: string; label: string; sub: string } & (
  | { kind: "page"; href: string; icon: React.ReactNode }
  | { kind: "book"; row: Book }
  | { kind: "student"; row: Student }
);

const LIMIT = 5;

/**
 * Cmd/Ctrl + K from anywhere. One box that reaches every book, every student
 * and every page, so nothing in the system is more than a few keystrokes away.
 *
 * There is no button for it. The librarian works this app all day from one
 * machine, and a shortcut stays out of the way until it is wanted.
 */
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<{ books: Book[]; students: Student[] }>({ books: [], students: [] });
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [book, setBook] = useState<Book | null>(null);
  const [student, setStudent] = useState<Student | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const latest = useRef(0);

  const q = term.trim();

  /* ---------- the shortcut ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((was) => !was);
        setTerm("");
        setActive(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- look things up ---------- */
  useEffect(() => {
    if (!open || !q) return;
    const id = ++latest.current;
    // the spinner belongs on screen from the keystroke, not from the request
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    const h = setTimeout(async () => {
      const supabase = createClient();
      const [books, students] = await Promise.all([
        supabase.from("books").select("*").or(bookLookup(q)).order("title").limit(LIMIT),
        supabase.from("students").select("*").or(studentLookup(q)).order("name").limit(LIMIT),
      ]);
      if (id !== latest.current) return; // a later keystroke already won
      setHits({ books: (books.data ?? []) as Book[], students: (students.data ?? []) as Student[] });
      setLoading(false);
    }, 160);

    return () => clearTimeout(h);
  }, [open, q]);

  /* ---------- focus and scroll lock ---------- */
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  /* ---------- what the list shows ---------- */
  // an empty box lists where you can go; a typed one lists what matches. Both
  // are derived, so nothing has to be cleared out of state between keystrokes.
  const items: Item[] = q
    ? [
        ...hits.books.map<Item>((b) => ({
          kind: "book",
          key: `b${b.id}`,
          group: "Books",
          label: b.title,
          sub: [b.author, b.available_copies > 0 ? `${b.available_copies} available` : "All copies out"]
            .filter(Boolean)
            .join(" · "),
          row: b,
        })),
        ...hits.students.map<Item>((s) => ({
          kind: "student",
          key: `s${s.id}`,
          group: "Students",
          label: s.name,
          sub: [s.roll_no, s.class_dept, s.status === "blocked" ? "Blocked" : null].filter(Boolean).join(" · "),
          row: s,
        })),
        ...PAGES.filter((p) => p.label.toLowerCase().includes(q.toLowerCase())).map<Item>((p) => ({
          kind: "page",
          key: `p${p.href}`,
          group: "Pages",
          ...p,
        })),
      ]
    : [
        ...ACTIONS.map<Item>((a) => ({ kind: "page", key: `a${a.href}`, group: "Actions", ...a, icon: null })),
        ...PAGES.map<Item>((p) => ({ kind: "page", key: `p${p.href}`, group: "Go to", ...p })),
      ];

  // results shrink as you type, so the cursor is clamped rather than reset
  const cursor = items.length === 0 ? 0 : Math.min(active, items.length - 1);

  const close = useCallback(() => setOpen(false), []);

  const choose = useCallback(
    (item: Item) => {
      setOpen(false); // the drawers sit below the palette, so it goes first
      if (item.kind === "page") router.push(item.href);
      else if (item.kind === "book") setBook(item.row);
      else setStudent(item.row);
    },
    [router]
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") return close();
    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      setActive(items.length ? (cursor + 1) % items.length : 0);
    } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
      e.preventDefault();
      setActive(items.length ? (cursor - 1 + items.length) % items.length : 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[cursor]) choose(items[cursor]);
    }
  }

  // keep the highlighted row in view when arrowing past the fold
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  return (
    <>
      {open && typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
            <div className="absolute inset-0 bg-navy-950/45" onClick={close} />

            <div className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-cream shadow-[0_28px_90px_rgba(5,31,66,0.45)]">
              {/* the box */}
              <div className="flex items-center gap-3 border-b border-mist-deep px-4">
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 flex-none text-ink-mute" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  ref={inputRef}
                  value={term}
                  onChange={(e) => { setTerm(e.target.value); setActive(0); }}
                  onKeyDown={onKeyDown}
                  placeholder="Search books, students and pages…"
                  aria-label="Search books, students and pages"
                  className="min-w-0 flex-1 bg-transparent py-4 text-[0.95rem] text-navy-900 outline-none placeholder:text-ink-mute"
                />
                {loading && <span className="h-3.5 w-3.5 flex-none animate-spin rounded-full border-2 border-mist-deep border-t-navy-700" />}
                <kbd className="flex-none rounded-md border border-mist-deep bg-paper px-1.5 py-0.5 font-mono text-[0.6rem] text-ink-mute">esc</kbd>
              </div>

              {/* results */}
              <div ref={listRef} className="max-h-[52vh] overflow-y-auto overscroll-contain p-2">
                {items.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-ink-mute">
                    {loading ? "Searching…" : <>Nothing matches <span className="font-semibold text-navy-900">{q}</span>.</>}
                  </p>
                ) : (
                  items.map((item, i) => {
                    const head = i === 0 || items[i - 1].group !== item.group ? item.group : null;
                    return (
                      <div key={item.key}>
                        {head && (
                          <p className="px-3 pb-1 pt-3 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-ink-mute">{head}</p>
                        )}
                        <button
                          type="button"
                          data-active={i === cursor}
                          onMouseMove={() => setActive(i)}
                          onClick={() => choose(item)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                            i === cursor ? "bg-navy-900 text-cream" : "hover:bg-mist"
                          }`}
                        >
                          <Glyph item={item} active={i === cursor} />
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-sm font-semibold ${i === cursor ? "text-cream" : "text-navy-900"}`}>
                              {item.label}
                            </span>
                            {item.sub && (
                              <span className={`block truncate text-xs ${i === cursor ? "text-navy-100/70" : "text-ink-mute"}`}>
                                {item.sub}
                              </span>
                            )}
                          </span>
                          {i === cursor && (
                            <kbd className="flex-none rounded-md bg-cream/15 px-1.5 py-0.5 font-mono text-[0.58rem] text-cream/80">↵</kbd>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* legend */}
              <div className="flex items-center justify-between border-t border-mist-deep bg-mist/60 px-4 py-2 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-ink-mute">
                <span>↑↓ move · ↵ open · esc close</span>
                <span>Cmd K</span>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* opened from a result — the same drawers the lists use */}
      <BookDrawer book={book} onClose={() => setBook(null)} />
      <StudentDrawer student={student} onClose={() => setStudent(null)} />
    </>
  );
}

function Glyph({ item, active }: { item: Item; active: boolean }) {
  const box = `flex h-8 w-8 flex-none items-center justify-center rounded-lg ${
    active ? "bg-cream/15 text-gold-400" : "bg-mist text-navy-700"
  }`;

  if (item.kind === "student") {
    return (
      <span className={`${box} font-display text-[0.7rem] font-bold`}>{initials(item.row.name)}</span>
    );
  }
  if (item.kind === "book") {
    return (
      <span className={box}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5.5A1.5 1.5 0 0 0 4 20.5V5.5Z" />
          <path d="M4 5.5A1.5 1.5 0 0 0 5.5 7H20" />
        </svg>
      </span>
    );
  }
  return (
    <span className={`${box} [&_svg]:h-4 [&_svg]:w-4`}>
      {item.icon ?? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      )}
    </span>
  );
}
