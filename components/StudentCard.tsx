"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { initials } from "@/components/Avatar";
import type { Student } from "@/lib/types";

export type CardLoan = {
  title: string;
  barcode: string | null;
  issued_at: string;
  due_at: string;
};

/**
 * "Print library card" button. Opens a print window with a branded student
 * card: identity + a QR encoding the student's unique id, and a borrowing table
 * pre-filled with current loans (with room to write in more book barcodes).
 */
export default function StudentCard({
  student,
  loans = [],
}: {
  student: Student;
  loans?: CardLoan[];
}) {
  const [busy, setBusy] = useState(false);

  async function printCard() {
    setBusy(true);
    // the QR encodes the student's unique roll number (or id) so it can be
    // scanned at the desk to pull up the member
    const payload = student.roll_no || student.id;
    const qr = await QRCode.toDataURL(payload, { margin: 1, width: 220 });
    setBusy(false);

    const w = window.open("", "_blank", "width=760,height=640");
    if (!w) return;

    const short = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const memberSince = new Date(student.created_at).getFullYear();
    const cardNo = (student.roll_no || student.id.slice(0, 8)).toUpperCase();

    // back of the card: barcodes of the books currently issued, plus blanks
    const ROWS = 10;
    const rows = Array.from({ length: ROWS }, (_, i) => {
      const l = loans[i];
      return `<tr>
        <td class="n">${i + 1}</td>
        <td class="mono">${l ? (l.barcode ?? "") : ""}</td>
        <td>${l ? short(l.issued_at) : ""}</td>
        <td>${l ? short(l.due_at) : ""}</td>
      </tr>`;
    }).join("");

    const photo = student.photo_url
      ? `<img class="photo" src="${student.photo_url}" alt="" />`
      : `<div class="photo ph">${initials(student.name)}</div>`;

    w.document.write(`
      <html>
        <head><title>${escapeHtml(student.name)} — library card</title>
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          * { margin:0; padding:0; box-sizing:border-box; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
              -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { display:flex; flex-direction:column; align-items:center; padding:6mm; background:#fff; }

          /* on-screen guidance only — never printed */
          .hint { max-width:150mm; margin-bottom:6mm; padding:3mm 4mm; border:1px solid #d3dbe8; border-radius:2mm;
                  background:#f4f6fa; color:#3a4a63; font-size:11px; line-height:1.5; }
          .hint b { color:#06377b; }
          @media print { .hint { display:none !important; } }

          .sheet { display:flex; gap:4mm; }
          /* dashed cut guide around each card */
          .slot { padding:2.5mm; border:0.2mm dashed #c7d1e0; border-radius:4.5mm;
                  break-inside:avoid; page-break-inside:avoid; }

          /* ID-1 portrait — same footprint as a driving licence */
          .card { width:54mm; height:85.6mm; border:0.4mm solid #06377b; border-radius:3mm;
                  overflow:hidden; display:flex; flex-direction:column; background:#fff;
                  break-inside:avoid; page-break-inside:avoid; }

          /* ---------- front ---------- */
          .fhead { background:#06377b; color:#fff; padding:2mm 2.5mm; text-align:center; }
          .brand { font-size:7px; font-weight:800; letter-spacing:.6px; text-transform:uppercase; }
          .type { font-size:5.5px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; color:#faa61a; margin-top:.5mm; }
          .fbody { padding:2.5mm 2.5mm 0; text-align:center; }
          .photo { width:21mm; height:21mm; border-radius:2mm; object-fit:cover; border:0.3mm solid #d3dbe8; display:block; margin:0 auto; }
          .photo.ph { display:flex; align-items:center; justify-content:center; background:#06377b; color:#fcbc4d; font-size:20px; font-weight:700; }
          .name { font-size:10.5px; font-weight:800; color:#06377b; margin-top:2mm; line-height:1.15; }
          .roll { font-family: ui-monospace, monospace; font-size:8px; font-weight:700; color:#12203a; margin-top:.8mm; letter-spacing:.4px; }
          .dept { font-size:6.5px; color:#6a778c; margin-top:.6mm; line-height:1.2; }
          .pill { display:inline-block; margin-top:1.4mm; padding:.6mm 2mm; border-radius:4mm;
                  font-size:5.5px; font-weight:800; letter-spacing:.6px; text-transform:uppercase; }
          .pill.ok { background:#dcfce7; color:#15803d; }
          .pill.no { background:#fee2e2; color:#b91c1c; }
          .fqr { margin-top:auto; text-align:center; padding:0 2.5mm 1.5mm; }
          .fqr img { width:19mm; height:19mm; }
          .fqr .no { font-family: ui-monospace, monospace; font-size:6.5px; font-weight:700; color:#12203a; letter-spacing:.6px; margin-top:.3mm; }
          .ffoot { background:#e9edf4; color:#6a778c; font-size:5.5px; letter-spacing:.8px; text-transform:uppercase;
                   text-align:center; padding:1.2mm; border-top:0.3mm solid #d3dbe8; }

          /* ---------- back ---------- */
          .bhead { background:#06377b; color:#fff; font-size:6px; font-weight:800; letter-spacing:1.2px;
                   text-transform:uppercase; text-align:center; padding:1.8mm; }
          table { width:100%; border-collapse:collapse; }
          th { background:#e9edf4; color:#6a778c; font-size:5px; letter-spacing:.5px; text-transform:uppercase;
               padding:1.2mm .8mm; text-align:left; }
          td { font-size:6px; color:#12203a; padding:0 .8mm; height:6.3mm; border-top:0.2mm solid #eef1f6; }
          td.n, th.n { width:5mm; color:#6a778c; text-align:center; }
          .mono { font-family: ui-monospace, monospace; letter-spacing:-.2px; }
          .bfoot { margin-top:auto; font-size:5px; letter-spacing:.6px; text-transform:uppercase; color:#6a778c;
                   text-align:center; padding:1.5mm; border-top:0.3mm solid #d3dbe8; line-height:1.5; }
        </style></head>
        <body>
          <div class="hint">
            <b>Before printing:</b> set <b>Scale</b> to <b>100%</b> (“Actual size”, not “Fit to page”) and turn
            <b>off</b> “Headers and footers” — otherwise the card won’t come out at true licence size and the page
            date/URL will print on the sheet. Cut along the dashed lines and glue the two faces back-to-back.
          </div>
          <div class="sheet">
            <!-- FRONT -->
            <div class="slot"><div class="card">
              <div class="fhead">
                <div class="brand">Central College Library</div>
                <div class="type">Student Library Card</div>
              </div>
              <div class="fbody">
                ${photo}
                <div class="name">${escapeHtml(student.name)}</div>
                <div class="roll">${student.roll_no ?? "—"}</div>
                <div class="dept">${escapeHtml(student.class_dept ?? "—")}</div>
                <span class="pill ${student.status === "active" ? "ok" : "no"}">${student.status === "active" ? "Active" : "Blocked"}</span>
              </div>
              <div class="fqr">
                <img src="${qr}" alt="QR" />
                <div class="no">${cardNo}</div>
              </div>
              <div class="ffoot">Member since ${memberSince}</div>
            </div></div>

            <!-- BACK -->
            <div class="slot"><div class="card">
              <div class="bhead">Books on loan</div>
              <table>
                <thead><tr><th class="n">#</th><th>Book barcode</th><th>Issued</th><th>Due</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
              <div class="bfoot">Property of Central College Library<br/>Non-transferable · Report if found</div>
            </div></div>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>`);
    w.document.close();
  }

  return (
    <button
      type="button"
      onClick={printCard}
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-navy-900 px-4 py-2.5 text-sm font-bold text-navy-900 transition-colors hover:bg-navy-900 hover:text-cream disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M15 9h3M15 13h3M5 16c.7-1.4 2-2 4-2s3.3.6 4 2" /></svg>
      {busy ? "Preparing…" : "Print library card"}
    </button>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
