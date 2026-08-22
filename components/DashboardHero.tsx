"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { greetingAt, stampAt } from "@/lib/greeting";

/**
 * The dashboard banner: a greeting that follows the clock, a live stamp, one
 * line about what the desk actually needs right now, and the four things the
 * librarian starts most days by doing.
 */
export default function DashboardHero({
  nowIso,
  overdue,
  readyHolds,
}: {
  /** Rendered on the server first, then kept ticking here. */
  nowIso: string;
  overdue: number;
  readyHolds: number;
}) {
  const [now, setNow] = useState(() => new Date(nowIso));

  useEffect(() => {
    // the stamp shows minutes, so a half-minute tick is enough to stay honest
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { lead, tail } = greetingAt(now);

  return (
    <section
      className="relative isolate overflow-hidden rounded-3xl px-6 py-7 shadow-[0_18px_44px_-20px_rgba(5,31,66,0.6)] sm:px-9 sm:py-8"
      style={{ background: "linear-gradient(112deg,#03142f 0%,#06377b 62%,#0a4488 100%)" }}
    >
      <HeroPattern />

      <div className="relative flex flex-col gap-6 sm:gap-7">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="max-w-xl">
            <h1 className="font-display text-[1.6rem] font-semibold leading-[1.15] tracking-[-0.01em] text-cream sm:text-[2rem]">
              {lead} <span className="text-gold-400">{tail}</span>
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-navy-100/65">
              <span className="block">
                Catalogue, students, circulation, fines and holds — all in one calm view.
              </span>
              <span className="block text-navy-100/85">{desk(overdue, readyHolds)}</span>
            </p>
          </div>
          <p className="pt-1.5 font-mono text-[0.6rem] uppercase tracking-[0.11em] text-navy-100/50 tabular-nums">
            {stampAt(now)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Action href="/circulation/issue" primary icon={<IconIssue />}>
            Issue a book
          </Action>
          <Action href="/books/new" icon={<IconPlus />}>Add book</Action>
          <Action href="/students/new" icon={<IconStudent />}>Add student</Action>
          <Action href="/guide" icon={<IconGuide />}>Guide</Action>
        </div>
      </div>
    </section>
  );
}

/** One line naming whatever is waiting, so the banner is never just decoration. */
function desk(overdue: number, ready: number): string {
  const bits: string[] = [];
  if (overdue > 0) bits.push(`${overdue} ${overdue === 1 ? "book is" : "books are"} overdue`);
  if (ready > 0) bits.push(`${ready} ${ready === 1 ? "hold is" : "holds are"} ready for pickup`);

  if (bits.length === 0) return "Nothing needs chasing right now — the desk is clear.";
  return `${bits.join(" and ")}.`;
}

function Action({
  href,
  children,
  icon,
  primary,
}: {
  href: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 ${
        primary
          ? "bg-gold-500 text-navy-950 hover:bg-gold-400"
          : "border border-cream/15 bg-cream/[0.07] text-navy-100/85 hover:border-cream/30 hover:bg-cream/15 hover:text-cream"
      }`}
    >
      <span className="h-3.5 w-3.5 flex-none">{icon}</span>
      {children}
    </Link>
  );
}

/* ---------- background ---------- */

/**
 * Book spines standing on a shelf, rising left to right. It reads as a bar
 * chart of a growing collection and as the shelf itself.
 */
/**
 * Book spines standing on a shelf, rising left to right. It reads as a bar
 * chart of a growing collection and as the shelf itself.
 */
const SPINES = (() => {
  const widths = [13, 9, 16, 11, 14, 10];
  let x = 22;
  return Array.from({ length: 26 }, (_, i) => {
    const w = widths[i % widths.length];
    const h = Math.round(24 + (i * 118) / 25 + (i % 2 ? -12 : 6));
    const spine = { x, w, h };
    x += w + 8;
    return spine;
  });
})();

/** Open books drifting across the panel, the way the other app used currency. */
const GLYPHS = [
  { x: 500, y: 24, s: 30 },
  { x: 640, y: 104, s: 44 },
  { x: 806, y: 18, s: 26 },
  { x: 928, y: 82, s: 34 },
  { x: 1076, y: 30, s: 28 },
  { x: 372, y: 172, s: 24 },
];

function HeroPattern() {
  return (
    <>
      {/* graph paper, fading out before it reaches the heading */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(214,226,244,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(214,226,244,0.07) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
          WebkitMaskImage: "linear-gradient(90deg, transparent 8%, #000 55%)",
          maskImage: "linear-gradient(90deg, transparent 8%, #000 55%)",
        }}
      />

      {/* drifting books, spread over the whole panel */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 260"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full text-navy-100"
        opacity="0.10"
      >
        <symbol id="hero-book" viewBox="0 0 24 24">
          <path
            d="M12 6.6C10.4 5.1 7.9 4.5 5 4.7v12.1c2.9-.2 5.4.4 7 1.9 1.6-1.5 4.1-2.1 7-1.9V4.7c-2.9-.2-5.4.4-7 1.9Zm0 0v12.1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>
        {GLYPHS.map((g) => (
          <use key={`${g.x}-${g.y}`} href="#hero-book" x={g.x} y={g.y} width={g.s} height={g.s} />
        ))}
      </svg>

      {/* the shelf, anchored to the bottom-right corner so it never crops */}
      <svg
        aria-hidden="true"
        viewBox="0 0 560 182"
        preserveAspectRatio="xMaxYMax meet"
        className="absolute bottom-0 right-0 h-[62%] w-[56%]"
      >
        <defs>
          <linearGradient id="hero-spine" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#d6e2f4" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#d6e2f4" stopOpacity="0.20" />
          </linearGradient>
        </defs>
        {SPINES.map((s) => (
          <rect key={s.x} x={s.x} y={168 - s.h} width={s.w} height={s.h} rx={3} fill="url(#hero-spine)" />
        ))}
        <rect x="0" y="168" width="560" height="1.5" fill="#faa61a" opacity="0.28" />
      </svg>

      {/* keeps the text side deep enough to read on */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-3/4 bg-gradient-to-r from-navy-950/80 via-navy-950/35 to-transparent"
      />
    </>
  );
}

/* ---------- icons ---------- */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const IconIssue = () => (
  <svg viewBox="0 0 24 24" {...stroke}><path d="M4 6h7a2 2 0 0 1 2 2v11M20 6h-5a2 2 0 0 0-2 2M4 6v11h7M20 6v6M17.5 17.5h5m-2.5-2.5v5" /></svg>
);
const IconPlus = () => (
  <svg viewBox="0 0 24 24" {...stroke}><path d="M12 5v14M5 12h14" /></svg>
);
const IconStudent = () => (
  <svg viewBox="0 0 24 24" {...stroke}><path d="M12 3 2 8l10 5 10-5-10-5Z M6 10.5V15c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5" /></svg>
);
const IconGuide = () => (
  <svg viewBox="0 0 24 24" {...stroke}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5V5.5Z M4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3" /></svg>
);
