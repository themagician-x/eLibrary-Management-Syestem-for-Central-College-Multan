"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/**
 * Scannable Code128 barcode for a book, with the title and shelf printed on the
 * label. The barcode encodes the book's `barcode` value so it matches the
 * circulation "scan to issue" lookup.
 */
export default function BookLabel({
  value,
  title,
  shelf,
}: {
  value: string;
  title: string;
  shelf?: string | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width: 1.6,
        height: 40,
        margin: 0,
        fontSize: 12,
        fontOptions: "bold",
        textMargin: 2,
        background: "#ffffff",
        lineColor: "#12203a",
      });
    } catch {
      /* invalid value — leave the svg empty */
    }
  }, [value]);

  function print() {
    const svg = svgRef.current?.outerHTML ?? "";
    const w = window.open("", "_blank", "width=360,height=280");
    if (!w) return;
    w.document.write(`
      <html>
        <head><title>${title} — label</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; font-family: ui-sans-serif, system-ui, sans-serif; }
          body { display:flex; align-items:center; justify-content:center; height:100vh; }
          .label { width:200px; border:1px solid #d3dbe8; border-radius:6px; padding:10px; text-align:center; }
          .t { font-size:10px; font-weight:700; color:#06377b; line-height:1.2; margin-bottom:5px; }
          svg { max-width:100%; height:auto; }
          .shelf { font-size:10px; font-weight:700; color:#12203a; margin-top:3px; }
          .shelf span { color:#6a778c; font-weight:600; font-size:8px; letter-spacing:1px; }
          .c { font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; color:#06377b; margin-top:5px; }
        </style></head>
        <body>
          <div class="label">
            <div class="t">${title}</div>
            ${svg}
            ${shelf ? `<div class="shelf"><span>SHELF</span> ${shelf}</div>` : ""}
            <div class="c">Central College Library</div>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>`);
    w.document.close();
  }

  return (
    <div className="rounded-xl border border-mist-deep bg-paper p-4">
      {value ? (
        <svg ref={svgRef} className="mx-auto h-auto max-w-full" />
      ) : (
        <p className="py-3 text-center text-xs text-ink-mute">No barcode assigned</p>
      )}
      {shelf && (
        <p className="mt-1 text-center text-xs font-semibold text-navy-900">
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ink-mute">Shelf</span> {shelf}
        </p>
      )}
      <p className="mt-1 text-center font-mono text-[0.55rem] font-bold uppercase tracking-[0.12em] text-navy-900/70">
        Central College Library
      </p>
      <button
        type="button"
        onClick={print}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-navy-900 px-4 py-2 text-sm font-bold text-navy-900 transition-colors hover:bg-navy-900 hover:text-cream"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M6 14h12v7H6z" /></svg>
        Print label
      </button>
    </div>
  );
}
