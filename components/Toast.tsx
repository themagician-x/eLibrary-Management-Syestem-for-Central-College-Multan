"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
};

type ToastApi = {
  success: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
};

const noop = () => {};
const Ctx = createContext<ToastApi>({ success: noop, error: noop, info: noop });

/** Confirmation messages for anything the admin does. */
export const useToast = () => useContext(Ctx);

const LIFETIME = 4500;
const ERROR_LIFETIME = 8000; // failures need longer to read than confirmations

const TONE: Record<ToastTone, { stripe: string; icon: string; path: string }> = {
  success: {
    stripe: "bg-ok",
    icon: "bg-ok-soft text-ok",
    path: "M20 6 9 17l-5-5",
  },
  error: {
    stripe: "bg-danger",
    icon: "bg-danger-soft text-danger",
    path: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  },
  info: {
    stripe: "bg-gold-500",
    icon: "bg-gold-100 text-gold-700",
    path: "M12 8h.01M11 12h1v4h1",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((tone: ToastTone, title: string, detail?: string) => {
    const id = nextId.current++;
    // three at a time is plenty; older ones drop off the top
    setToasts((list) => [...list, { id, tone, title, detail }].slice(-3));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, detail) => push("success", title, detail),
      error: (title, detail) => push("error", title, detail),
      info: (title, detail) => push("info", title, detail),
    }),
    [push]
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </Ctx.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  // Render nothing until there is something to show. That also keeps the first
  // client render identical to the server's — a portal that only exists on the
  // client is a hydration mismatch, and toasts can only ever appear after an
  // interaction anyway.
  if (toasts.length === 0 || typeof document === "undefined") return null;

  return createPortal(
    <div
      // Bottom right. Sits above the modal (z-50) and the confirm dialog (z-70).
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [shown, setShown] = useState(false);
  const [paused, setPaused] = useState(false);
  const tone = TONE[toast.tone];

  // slide in on mount
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);

  // auto-dismiss, held while the pointer is over it so it can be read
  useEffect(() => {
    if (paused) return;
    const life = toast.tone === "error" ? ERROR_LIFETIME : LIFETIME;
    const t = setTimeout(() => onDismiss(toast.id), life);
    return () => clearTimeout(t);
  }, [paused, toast.id, toast.tone, onDismiss]);

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`pointer-events-auto flex w-full max-w-sm gap-3 overflow-hidden rounded-xl border border-mist-deep bg-paper pr-3 shadow-[0_12px_40px_rgba(5,31,66,0.18)] transition-all duration-200 motion-reduce:transition-none ${
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <span className={`w-1 flex-none ${tone.stripe}`} aria-hidden="true" />

      <span className={`mt-3 flex h-7 w-7 flex-none items-center justify-center rounded-full ${tone.icon}`}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={tone.path} />
        </svg>
      </span>

      <span className="min-w-0 flex-1 py-2.5">
        <span className="block text-sm font-bold text-navy-900">{toast.title}</span>
        {toast.detail && <span className="mt-0.5 block text-xs text-ink-soft">{toast.detail}</span>}
      </span>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="mt-2.5 flex h-6 w-6 flex-none items-center justify-center self-start rounded-md text-ink-mute transition-colors hover:bg-mist hover:text-navy-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
