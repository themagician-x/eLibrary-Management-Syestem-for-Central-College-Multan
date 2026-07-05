"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import PageShell from "@/components/PageShell";
import { importBooks, type ImportRow } from "./actions";

const HEADER_MAP: Record<string, keyof ImportRow> = {
  title: "title", name: "title",
  author: "author", authors: "author",
  isbn: "isbn",
  publisher: "publisher",
  year: "published_year", published_year: "published_year", "publication year": "published_year",
  category: "category", genre: "category", subject: "category",
  language: "language",
  shelf: "shelf", location: "shelf", "shelf location": "shelf",
  copies: "total_copies", total_copies: "total_copies", quantity: "total_copies",
};

function toRow(raw: Record<string, string>): ImportRow {
  const row: ImportRow = { title: "" };
  for (const [key, value] of Object.entries(raw)) {
    const field = HEADER_MAP[key.trim().toLowerCase()];
    if (!field || value == null) continue;
    const v = String(value).trim();
    if (field === "published_year") row.published_year = parseInt(v, 10) || null;
    else if (field === "total_copies") row.total_copies = parseInt(v, 10) || 1;
    else (row[field] as string) = v;
  }
  return row;
}

export default function ImportPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const parsed = res.data.map(toRow).filter((r) => r.title);
        if (parsed.length === 0) setError("No rows with a title were found. Check your column headers.");
        setRows(parsed);
      },
      error: () => setError("Couldn't parse that file. Is it a valid CSV?"),
    });
  }

  async function runImport() {
    setBusy(true);
    setError(null);
    const res = await importBooks(rows);
    setBusy(false);
    if (res.error) {
      setError(res.error);
    } else {
      setResult(`Imported ${res.inserted} book${res.inserted === 1 ? "" : "s"}.`);
      setRows([]);
      setTimeout(() => router.push("/books"), 1000);
    }
  }

  const template =
    "data:text/csv;charset=utf-8," +
    encodeURIComponent(
      "title,author,isbn,publisher,year,category,language,shelf,copies\n" +
        "Introduction to Algorithms,Cormen,9780262033848,MIT Press,2009,Computer Science,English,Rack A-1,3\n"
    );

  return (
    <PageShell
      title="Import books"
      subtitle="Bulk-add a catalogue from a CSV file."
      actions={
        <Link href="/books" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist">
          ← Back to books
        </Link>
      }
    >
      {/* instructions */}
      <div className="mb-6 rounded-2xl border border-mist-deep bg-paper p-6">
        <p className="text-sm text-ink-soft">
          Upload a <strong className="text-navy-900">.csv</strong> file with a header row. Recognised columns:
        </p>
        <p className="mt-3 font-mono text-xs text-ink-mute">
          title · author · isbn · publisher · year · category · language · shelf · copies
        </p>
        <p className="mt-3 text-sm text-ink-mute">
          Only <strong className="text-navy-900">title</strong> is required. A QR/barcode is generated for every book automatically.
        </p>
        <a href={template} download="books-template.csv" className="mt-4 inline-block text-sm font-semibold text-gold-700 hover:text-navy-900">
          ↓ Download a template
        </a>
      </div>

      {/* file input */}
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-mist-deep bg-cream px-6 py-10 text-center transition-colors hover:border-gold-500">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-ink-mute" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3M8 7l4-4 4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
        <span className="mt-3 text-sm font-semibold text-navy-900">{fileName || "Choose a CSV file"}</span>
        <span className="mt-1 text-xs text-ink-mute">or drag it onto this area</span>
        <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
      </label>

      {error && <p className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>}
      {result && <p className="mt-4 rounded-lg border border-ok/20 bg-ok-soft px-3.5 py-2.5 text-sm text-ok">{result} Redirecting…</p>}

      {/* preview */}
      {rows.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-wider text-ink-mute">
              {rows.length} book{rows.length === 1 ? "" : "s"} ready to import
            </p>
            <button onClick={runImport} disabled={busy} className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-navy-800 disabled:opacity-60">
              {busy ? "Importing…" : `Import ${rows.length} books`}
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-mist-deep">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-mist">
                <tr className="font-mono text-[0.6rem] uppercase tracking-wider text-ink-mute">
                  <th className="px-4 py-2.5">Title</th><th className="px-4 py-2.5">Author</th>
                  <th className="px-4 py-2.5">ISBN</th><th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Copies</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t border-mist bg-paper">
                    <td className="px-4 py-2.5 font-semibold text-navy-900">{r.title}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{r.author || "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-mute">{r.isbn || "—"}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{r.category || "—"}</td>
                    <td className="px-4 py-2.5 tabular-nums text-ink-soft">{r.total_copies ?? 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 50 && <p className="mt-2 text-xs text-ink-mute">Showing first 50 of {rows.length}.</p>}
        </div>
      )}
    </PageShell>
  );
}
