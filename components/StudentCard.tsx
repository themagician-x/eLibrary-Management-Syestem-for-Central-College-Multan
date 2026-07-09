"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Student } from "@/lib/types";

export type CardLoan = {
  title: string;
  barcode: string | null;
  issued_at: string;
  due_at: string;
};

/** Blank rows to write future book barcodes into. More than this won't fit. */
const ROWS = 7;

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

.sc .head, .sc .bhead, .sc table, .sc .foot { flex:none; }
.sc .head { background:#06377b; color:#fff; text-align:center; padding:1.8mm 2mm; }
.sc .brand { font-size:6.5px; font-weight:800; letter-spacing:.6px; text-transform:uppercase; }
.sc .type { font-size:5px; font-weight:700; letter-spacing:1.3px; text-transform:uppercase;
  color:#faa61a; margin-top:.4mm; }

/* fixed height: a long name must never push the footer out of the card */
.sc .id { display:flex; flex:none; gap:2mm; padding:2.5mm; align-items:flex-start;
  height:26mm; overflow:hidden; }
.sc .info { flex:1; min-width:0; overflow:hidden; }
.sc .name { font-size:9.5px; font-weight:800; color:#06377b; line-height:1.15; }
.sc .field { margin-top:1.3mm; }
.sc .k { display:block; font-size:4.6px; letter-spacing:.7px; text-transform:uppercase; color:#6a778c; }
.sc .v { display:block; font-size:6.4px; font-weight:700; color:#12203a; line-height:1.25; }
/* long names and departments wrap to two lines, then ellipsis */
.sc .name, .sc .v { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2;
  overflow:hidden; overflow-wrap:anywhere; }
.sc .pill { display:inline-block; margin-top:1.5mm; padding:.5mm 1.8mm; border-radius:3mm;
  font-size:5px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; }
.sc .pill.ok { background:#dcfce7; color:#15803d; }
.sc .pill.no { background:#fee2e2; color:#b91c1c; }

.sc .qr { flex:none; text-align:center; }
.sc .qr img { width:19mm; height:19mm; display:block; }
.sc .qr .no { font-family:ui-monospace, monospace; font-size:5.6px; font-weight:700;
  color:#12203a; margin-top:.5mm; letter-spacing:.3px; }

.sc .bhead { background:#e9edf4; color:#6a778c; font-size:5px; font-weight:800; letter-spacing:1px;
  text-transform:uppercase; padding:1.2mm 2.5mm; border-top:0.2mm solid #d3dbe8; }
.sc table { width:100%; border-collapse:collapse; }
.sc th { background:#f4f6fa; color:#6a778c; font-size:4.6px; letter-spacing:.4px;
  text-transform:uppercase; padding:1mm .8mm; text-align:left; }
.sc td { font-size:5.6px; color:#12203a; padding:0 .8mm; height:5.5mm; border-top:0.2mm solid #eef1f6; }
.sc td.n, .sc th.n { width:4.5mm; text-align:center; color:#6a778c; }
.sc .mono { font-family:ui-monospace, monospace; letter-spacing:-.2px; }

.sc .foot { margin-top:auto; background:#06377b; color:#fff; font-size:4.6px; letter-spacing:.6px;
  text-transform:uppercase; text-align:center; padding:1.4mm; line-height:1.5; }
`;

const short = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

function cardHtml(student: Student, loans: CardLoan[], qr: string) {
  const memberSince = new Date(student.created_at).getFullYear();
  const cardNo = (student.roll_no || student.id.slice(0, 8)).toUpperCase();
  const active = student.status === "active";

  const rows = Array.from({ length: ROWS }, (_, i) => {
    const l = loans[i];
    return `<tr>
      <td class="n">${i + 1}</td>
      <td class="mono">${l?.barcode ? escapeHtml(l.barcode) : ""}</td>
      <td>${l ? short(l.issued_at) : ""}</td>
      <td>${l ? short(l.due_at) : ""}</td>
    </tr>`;
  }).join("");

  return `<div class="sc">
    <div class="head">
      <div class="brand">Central College Library</div>
      <div class="type">Student Library Card</div>
    </div>

    <div class="id">
      <div class="info">
        <div class="name">${escapeHtml(student.name)}</div>
        <div class="field">
          <span class="k">Roll no</span>
          <span class="v mono">${escapeHtml(student.roll_no ?? "—")}</span>
        </div>
        <div class="field">
          <span class="k">Class / Dept</span>
          <span class="v">${escapeHtml(student.class_dept ?? "—")}</span>
        </div>
        <span class="pill ${active ? "ok" : "no"}">${active ? "Active" : "Blocked"}</span>
      </div>
      <div class="qr">
        <img src="${qr}" alt="" />
        <div class="no">${escapeHtml(cardNo)}</div>
      </div>
    </div>

    <div class="bhead">Books on loan</div>
    <table>
      <thead><tr><th class="n">#</th><th>Book barcode</th><th>Issued</th><th>Due</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="foot">Member since ${memberSince} · Property of Central College Library</div>
  </div>`;
}

/**
 * Single-sided ID-1 student library card: a live preview plus a print button.
 * The QR encodes the student's roll number so scanning it at the desk finds the
 * member through the existing student search.
 */
export default function StudentCard({
  student,
  loans = [],
}: {
  student: Student;
  loans?: CardLoan[];
}) {
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
        <div class="slot">${cardHtml(student, loans, qr)}</div>
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
          <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: cardHtml(student, loans, qr) }} />
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
