"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Student } from "@/lib/types";

/**
 * The card itself, scoped under `.sc` so the rules can't leak into the app.
 * Sized in mm so it prints at true ID-1 (driving-licence) size: 54 × 85.6 mm.
 * The same string feeds the on-screen preview and the print window, so what the
 * librarian sees in the drawer is exactly what comes out of the printer.
 */
const CARD_CSS = `
.sc, .sc * { margin:0; padding:0; box-sizing:border-box; line-height:1.2;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.sc { width:54mm; height:85.6mm; border:0.4mm solid #06377b; border-radius:3mm;
  overflow:hidden; display:flex; flex-direction:column; background:#fff;
  break-inside:avoid; page-break-inside:avoid; }

.sc .head { flex:none; background:#06377b; color:#fff; text-align:center; padding:2.2mm 2mm; }
.sc .brand { font-size:7px; font-weight:800; letter-spacing:.6px; text-transform:uppercase; }
.sc .type { font-size:5.2px; font-weight:700; letter-spacing:1.3px; text-transform:uppercase;
  color:#faa61a; margin-top:.5mm; }

/* identity, full width now that nothing competes for the space */
.sc .id { flex:none; padding:3mm 3.5mm 1.8mm; }
.sc .name { font-size:11px; font-weight:800; color:#06377b; line-height:1.15;
  display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2;
  overflow:hidden; overflow-wrap:anywhere; }
.sc .field { margin-top:1.5mm; }
.sc .k { display:block; font-size:4.8px; letter-spacing:.7px; text-transform:uppercase; color:#6a778c; }
.sc .v { display:block; font-size:7px; font-weight:700; color:#12203a; line-height:1.25;
  display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2;
  overflow:hidden; overflow-wrap:anywhere; }

/* the scan target — large, because a worn card reads badly at 19mm */
.sc .qr { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:1.2mm; padding:1mm 3.5mm 2mm; border-top:0.2mm solid #e9edf4; margin-top:1.5mm; }
.sc .qr img { width:30mm; height:30mm; display:block; }
.sc .qr .no { font-family:ui-monospace, monospace; font-size:7.4px; font-weight:700;
  color:#12203a; letter-spacing:.4px; }
.sc .qr .scan { font-size:4.6px; letter-spacing:.6px; text-transform:uppercase; color:#6a778c; }

.sc .foot { flex:none; background:#06377b; color:#fff; font-size:4.6px; letter-spacing:.5px;
  text-transform:uppercase; text-align:center; padding:1.6mm 2mm; line-height:1.6; }
.sc .foot .lost { color:#fcbc4d; }
`;

function cardHtml(student: Student, qr: string) {
  const memberSince = new Date(student.created_at).getFullYear();
  const cardNo = (student.roll_no || student.id.slice(0, 8)).toUpperCase();

  return `<div class="sc">
    <div class="head">
      <div class="brand">Central College Library</div>
      <div class="type">Student Library Card</div>
    </div>

    <div class="id">
      <div class="name">${escapeHtml(student.name)}</div>
      <div class="field">
        <span class="k">Roll no</span>
        <span class="v">${escapeHtml(student.roll_no ?? "—")}</span>
      </div>
      <div class="field">
        <span class="k">Class / Dept</span>
        <span class="v">${escapeHtml(student.class_dept ?? "—")}</span>
      </div>
      <div class="field">
        <span class="k">Member since</span>
        <span class="v">${memberSince}</span>
      </div>
    </div>

    <div class="qr">
      <img src="${qr}" alt="" />
      <div class="no">${escapeHtml(cardNo)}</div>
      <div class="scan">Scan at the library desk</div>
    </div>

    <div class="foot">
      Property of Central College Library<br />
      <span class="lost">If found, please return it to the library</span>
    </div>
  </div>`;
}

/**
 * Single-sided ID-1 student library card: a live preview plus a print button.
 *
 * Identification only. The QR carries nothing but the roll number — scanning it
 * at the desk finds the member through the existing student search, and what
 * they have on loan is read from the system rather than written on the card.
 *
 * Nothing here can go out of date: name, roll number, department and join year
 * are fixed for the life of the card. Borrowing status deliberately is not on
 * it — a blocked student would still be holding a card that said "Active".
 * The block is enforced at the desk, where it is always current.
 */
export default function StudentCard({ student }: { student: Student }) {
  const payload = student.roll_no || student.id;
  const [cached, setCached] = useState<{ payload: string; url: string } | null>(null);
  // keyed by payload so a stale QR is never shown for the next student opened
  const qr = cached?.payload === payload ? cached.url : null;

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(payload, { margin: 1, width: 220 })
      .then((url) => alive && setCached({ payload, url }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [payload]);

  function print() {
    if (!qr) return;
    const w = window.open("", "_blank", "width=760,height=680");
    if (!w) return;

    w.document.write(`<html>
      <head><title>${escapeHtml(student.name)} — library card</title>
      <style>
        @page { size: A4 portrait; margin: 8mm; }
        * { margin:0; padding:0; box-sizing:border-box;
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
        body { display:flex; flex-direction:column; align-items:center; padding:8mm; background:#f4f6fa; }

        /* on-screen guidance only — never printed */
        .hint { max-width:150mm; margin-bottom:6mm; padding:3mm 4mm; border:1px solid #d3dbe8;
                border-radius:2mm; background:#fff; color:#3a4a63; font-size:11px; line-height:1.55; }
        .hint b { color:#06377b; }
        @media print { .hint { display:none !important; } body { background:#fff; padding:0; } }

        /* dashed cut guide */
        .slot { padding:2.5mm; border:0.2mm dashed #c7d1e0; border-radius:4.5mm; background:#fff;
                break-inside:avoid; page-break-inside:avoid; }

        ${CARD_CSS}
      </style></head>
      <body>
        <div class="hint">
          <b>Before printing:</b> set <b>Scale</b> to <b>100%</b> (&ldquo;Actual size&rdquo;, not
          &ldquo;Fit to page&rdquo;) and turn <b>off</b> &ldquo;Headers and footers&rdquo; &mdash; otherwise the
          card won&rsquo;t come out at true licence size. Cut along the dashed line. This banner never prints.
        </div>
        <div class="slot">${cardHtml(student, qr)}</div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
    </html>`);
    w.document.close();
  }

  return (
    <div>
      <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">Library card</p>
      <div className="rounded-2xl border border-mist-deep bg-paper p-4">
        <style dangerouslySetInnerHTML={{ __html: CARD_CSS }} />
        {qr ? (
          <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: cardHtml(student, qr) }} />
        ) : (
          <div className="mx-auto animate-pulse rounded-xl bg-mist" style={{ width: "54mm", height: "85.6mm" }} />
        )}
        <button
          type="button"
          onClick={print}
          disabled={!qr}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-navy-900 px-4 py-2.5 text-sm font-bold text-navy-900 transition-colors hover:bg-navy-900 hover:text-cream disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M6 14h12v7H6z" /></svg>
          Print library card
        </button>
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
