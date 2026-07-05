"use client";

export default function PrintLabel({
  qr,
  title,
  barcode,
}: {
  qr: string;
  title: string;
  barcode: string;
}) {
  function print() {
    const w = window.open("", "_blank", "width=420,height=520");
    if (!w) return;
    w.document.write(`
      <html>
        <head><title>${title} — label</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; font-family: ui-sans-serif, system-ui, sans-serif; }
          body { display:flex; align-items:center; justify-content:center; height:100vh; }
          .label { width:260px; border:1px solid #ccd7e8; border-radius:12px; padding:18px; text-align:center; }
          .label img { width:150px; height:150px; }
          .t { font-size:13px; font-weight:700; color:#06377b; margin-top:8px; line-height:1.3; }
          .b { font-family: ui-monospace, monospace; font-size:12px; letter-spacing:2px; color:#12203a; margin-top:6px; }
          .c { font-size:9px; text-transform:uppercase; letter-spacing:2px; color:#6a778c; margin-top:8px; }
        </style></head>
        <body>
          <div class="label">
            <img src="${qr}" alt="QR" />
            <div class="t">${title}</div>
            <div class="b">${barcode}</div>
            <div class="c">Central College Library</div>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>`);
    w.document.close();
  }

  return (
    <button
      type="button"
      onClick={print}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-navy-900 px-4 py-2.5 text-sm font-bold text-navy-900 transition-colors hover:bg-navy-900 hover:text-cream"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M6 14h12v7H6z" /></svg>
      Print label
    </button>
  );
}
