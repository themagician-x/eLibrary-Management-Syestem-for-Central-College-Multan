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

    const w = window.open("", "_blank", "width=780,height=620");
    if (!w) return;

    const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const memberSince = new Date(student.created_at).getFullYear();
    const cardNo = (student.roll_no || student.id.slice(0, 8)).toUpperCase();

    const ROWS = 10;
    const body = Array.from({ length: ROWS }, (_, i) => {
      const l = loans[i];
      return `<tr>
        <td class="n">${i + 1}</td>
        <td>${l ? escapeHtml(l.title) : ""}</td>
        <td class="mono">${l ? (l.barcode ?? "") : ""}</td>
        <td>${l ? fmt(l.issued_at) : ""}</td>
        <td>${l ? fmt(l.due_at) : ""}</td>
        <td></td>
      </tr>`;
    }).join("");

    const photo = student.photo_url
      ? `<img class="photo" src="${student.photo_url}" alt="" />`
      : `<div class="photo ph">${initials(student.name)}</div>`;

    w.document.write(`
      <html>
        <head><title>${escapeHtml(student.name)} — library card</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
          body { display:flex; justify-content:center; padding:24px; }
          .card { width:700px; border:2px solid #06377b; border-radius:14px; overflow:hidden; }
          .head { background:#06377b; color:#fff; padding:12px 20px; display:flex; justify-content:space-between; align-items:center; }
          .brand { font-weight:800; letter-spacing:.4px; font-size:15px; }
          .type { font-size:10px; text-transform:uppercase; letter-spacing:2px; color:#faa61a; font-weight:700; }
          .body { display:flex; gap:20px; padding:18px 20px; align-items:center; }
          .photo { width:96px; height:96px; border-radius:10px; object-fit:cover; border:1px solid #d3dbe8; flex:none; }
          .photo.ph { display:flex; align-items:center; justify-content:center; background:#06377b; color:#fcbc4d; font-size:30px; font-weight:700; }
          .info { flex:1; }
          .info h1 { font-size:20px; color:#06377b; margin-bottom:6px; }
          .row { font-size:12px; color:#12203a; margin:2px 0; }
          .row span { color:#6a778c; display:inline-block; width:74px; text-transform:uppercase; font-size:9px; letter-spacing:1px; }
          .qr { text-align:center; flex:none; }
          .qr img { width:96px; height:96px; }
          .qr .no { font-family: ui-monospace, monospace; font-size:11px; color:#12203a; margin-top:3px; letter-spacing:1px; font-weight:700; }
          table { width:100%; border-collapse:collapse; font-size:11px; }
          caption { text-align:left; padding:6px 20px; font-size:9px; text-transform:uppercase; letter-spacing:1.5px; color:#6a778c; }
          th { background:#e9edf4; color:#6a778c; text-transform:uppercase; font-size:9px; letter-spacing:.6px; padding:6px 8px; text-align:left; border-top:1px solid #d3dbe8; }
          td { padding:6px 8px; border-top:1px solid #eef1f6; height:24px; color:#12203a; }
          td.n, th.n { width:26px; color:#6a778c; }
          .mono { font-family: ui-monospace, monospace; }
          .foot { padding:8px 20px; font-size:9px; text-transform:uppercase; letter-spacing:1.5px; color:#6a778c; text-align:center; border-top:1px solid #d3dbe8; }
        </style></head>
        <body>
          <div class="card">
            <div class="head"><div class="brand">Central College Library</div><div class="type">Student Library Card</div></div>
            <div class="body">
              ${photo}
              <div class="info">
                <h1>${escapeHtml(student.name)}</h1>
                <div class="row"><span>Roll no</span> ${student.roll_no ?? "—"}</div>
                <div class="row"><span>Class</span> ${escapeHtml(student.class_dept ?? "—")}</div>
                <div class="row"><span>Member</span> Since ${memberSince}</div>
                <div class="row"><span>Status</span> ${student.status === "active" ? "Active" : "Blocked"}</div>
              </div>
              <div class="qr"><img src="${qr}" alt="QR" /><div class="no">${cardNo}</div></div>
            </div>
            <table>
              <caption>Books on loan</caption>
              <thead><tr><th class="n">#</th><th>Book</th><th>Barcode</th><th>Issued</th><th>Due</th><th>Returned</th></tr></thead>
              <tbody>${body}</tbody>
            </table>
            <div class="foot">Property of Central College Library · Non-transferable · Report if found</div>
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
