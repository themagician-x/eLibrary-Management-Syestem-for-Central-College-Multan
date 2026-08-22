"use client";

import { useActionState, useEffect, useState } from "react";
import { login, type LoginState } from "./actions";

const initial: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initial);
  const [showPassword, setShowPassword] = useState(false);

  // the lockout is derived from the server's deadline, not copied into state;
  // the interval only advances the clock, so there is nothing to keep in sync
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!state.lockedUntil) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [state.lockedUntil]);

  const locked = state.lockedUntil
    ? Math.max(0, Math.ceil((new Date(state.lockedUntil).getTime() - now) / 1000))
    : 0;

  const mm = Math.floor(locked / 60);
  const ss = String(locked % 60).padStart(2, "0");

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-ink-soft">
          Email
        </span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="admin@central.edu.pk"
          className="w-full rounded-xl border border-mist-deep bg-cream px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-mute/60 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-ink-soft">
          Password
        </span>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full rounded-xl border border-mist-deep bg-cream px-4 py-3 pr-12 text-sm text-ink outline-none transition-colors placeholder:text-ink-mute/60 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-mute transition-colors hover:bg-mist hover:text-navy-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M16.7 16.7A9.3 9.3 0 0 1 12 18c-5 0-9-4.5-10-6a15.6 15.6 0 0 1 4.2-4.7m3.3-1.1A9.6 9.6 0 0 1 12 6c5 0 9 4.5 10 6a15.7 15.7 0 0 1-2.6 3.3" />
                <path d="m3 3 18 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </label>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
        >
          {locked > 0
            ? `Too many failed attempts. Try again in ${mm > 0 ? `${mm}:${ss}` : `${locked} second${locked === 1 ? "" : "s"}`}.`
            : state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || locked > 0}
        className="w-full rounded-xl bg-navy-900 px-6 py-3.5 text-sm font-bold text-cream transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {locked > 0
          ? `Locked — ${mm > 0 ? `${mm}:${ss}` : `${locked}s`}`
          : pending
            ? "Signing in…"
            : "Sign in"}
      </button>
    </form>
  );
}
