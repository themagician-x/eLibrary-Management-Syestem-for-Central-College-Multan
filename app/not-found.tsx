import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream px-5">
      <div className="w-full max-w-md text-center">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-gold-700">
          Central College Library
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-navy-900">
          That page isn&rsquo;t here
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          The link may be out of date, or the book or student it pointed to has since
          been removed from the catalogue.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/"
            className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-navy-800"
          >
            Back to dashboard
          </Link>
          <Link
            href="/books"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist"
          >
            Browse books
          </Link>
        </div>
      </div>
    </div>
  );
}
