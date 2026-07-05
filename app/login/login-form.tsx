"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initial: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initial);

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
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="w-full rounded-xl border border-mist-deep bg-cream px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-mute/60 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25"
        />
      </label>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-navy-900 px-6 py-3.5 text-sm font-bold text-cream transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
