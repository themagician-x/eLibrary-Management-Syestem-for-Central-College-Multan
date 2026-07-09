"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ModalProvider } from "@/components/unsaved";

/**
 * Route-driven modal for intercepting routes. Full-screen on mobile (reads as a
 * page), a centered dialog on large screens. Closing calls router.back() so the
 * underlying list reappears; if a child form flagged unsaved changes, it asks
 * for confirmation first.
 */
export default function Modal({
  title,
  subtitle,
  children,
  maxWidthClass = "lg:max-w-3xl",
  overflowVisible = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
  // let short forms' popovers (async pickers) spill past the card instead of
  // being clipped by the scroll area
  overflowVisible?: boolean;
}) {
  const router = useRouter();
  const dirtyRef = useRef(false);
  const [shown, setShown] = useState(false);

  const setDirty = useCallback((d: boolean) => {
    dirtyRef.current = d;
  }, []);

  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);

  // programmatic dismiss (e.g. after a successful save) — no dirty guard
  const dismiss = useCallback(() => {
    setShown(false);
    setTimeout(() => router.back(), 180);
  }, [router]);

  // user-initiated close (overlay / esc / ×) — guarded when there are edits
  const requestClose = useCallback(() => {
    if (dirtyRef.current && !window.confirm("You have unsaved changes. Discard them and close?")) {
      return;
    }
    dismiss();
  }, [dismiss]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [requestClose]);

  const ctx = useMemo(() => ({ setDirty, close: dismiss }), [setDirty, dismiss]);

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={title}>
      <div
        onClick={requestClose}
        className={`absolute inset-0 bg-navy-950/45 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`relative m-auto flex h-dvh w-full flex-col bg-cream shadow-[0_24px_80px_rgba(5,31,66,0.4)] transition duration-200 lg:h-auto lg:max-h-[90dvh] lg:w-full lg:rounded-2xl ${maxWidthClass} ${
          shown ? "translate-y-0 opacity-100 lg:scale-100" : "translate-y-4 opacity-0 lg:translate-y-0 lg:scale-95"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-mist-deep px-6 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-navy-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-ink-mute">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-ink-mute transition-colors hover:bg-mist hover:text-navy-900"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className={`flex-1 px-6 py-6 ${overflowVisible ? "" : "overflow-y-auto overscroll-contain"}`}>
          <ModalProvider value={ctx}>{children}</ModalProvider>
        </div>
      </div>
    </div>
  );
}
