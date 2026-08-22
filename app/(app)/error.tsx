"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Catches a failure inside the app shell, so the sidebar stays put and the
 * admin has somewhere to go. Without this, an unhandled error drops them on
 * Next.js's own screen with no way back.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-5 px-5 py-16 sm:px-8">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
      </span>

      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
          Something went wrong on this page
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          The page couldn&rsquo;t finish loading. Nothing you were doing has been saved.
          Try again — if it keeps happening, check that the database is reachable.
        </p>
      </div>

      {error.digest && (
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-ink-mute">
          Reference {error.digest}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-navy-800"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
