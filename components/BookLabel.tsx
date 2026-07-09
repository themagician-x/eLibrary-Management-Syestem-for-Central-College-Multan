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
        width: 2,
        height: 56,
        margin: 6,
        fontSize: 15,
        fontOptions: "bold",
        textMargin: 4,
        background: "#ffffff",
        lineColor: "#12203a",
      });
    } catch {
      /* invalid value — leave the svg empty */
    }
  }, [value]);

  function print() {
    const svg = svgRef.current?.outerHTML ?? "";
    const w = window.open("", "_blank", "width=440,height=560");
    if (!w) return;
    w.document.write(`
      <html>
        <head><title>${title} — label</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; font-family: ui-sans-serif, system-ui, sans-serif; }
          body { display:flex; align-items:center; justify-content:center; height:100vh; }
          .label { width:320px; border:1px solid #ccd7e8; border-radius:12px; padding:18px; text-align:center; }
          .t { font-size:14px; font-weight:700; color:#06377b; margin-bottom:10px; line-height:1.3; }
          .shelf { font-size:13px; font-weight:700; letter-spacing:1px; color:#12203a; margin-top:10px; }
          .shelf span { color:#6a778c; font-weight:600; font-size:10px; letter-spacing:2px; }
          .c { font-size:9px; text-transform:uppercase; letter-spacing:2px; color:#6a778c; margin-top:10px; }
          svg { max-width:100%; height:auto; }
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
    <div className="rounded-2xl border border-mist-deep bg-paper p-5">
      <p className="mb-3 text-center font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">Scan code</p>
      {value ? (
        <svg ref={svgRef} className="mx-auto h-auto max-w-full" />
      ) : (
        <p className="py-4 text-center text-xs text-ink-mute">No barcode assigned</p>
      )}
      {shelf && (
        <p className="mt-2 text-center text-sm font-semibold text-navy-900">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ink-mute">Shelf</span> {shelf}
        </p>
      )}
      <button
        type="button"
        onClick={print}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-navy-900 px-4 py-2.5 text-sm font-bold text-navy-900 transition-colors hover:bg-navy-900 hover:text-cream"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M6 14h12v7H6z" /></svg>
        Print label
      </button>
    </div>
  );
}
