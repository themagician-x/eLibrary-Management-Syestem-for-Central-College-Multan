import type { Metadata } from "next";
import Image from "next/image";
import LoginForm from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* brand panel */}
      <section className="crest-lines relative hidden flex-col justify-between bg-navy-950 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cream p-1.5">
            <Image
              src="/central-logo-mark.png"
              alt="Central College logo"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </span>
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold text-cream">
              Central College
            </p>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-navy-100/60">
              Library System
            </p>
          </div>
        </div>

        <div>
          <p className="eyebrow" style={{ color: "var(--color-gold-400)" }}>
            Staff access
          </p>
          <h1 className="mt-4 max-w-md font-display text-4xl font-semibold leading-tight text-cream">
            The library desk, digitised.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-100/75">
            Catalogue, students, circulation, fines and reservations — managed
            from one place, at Central College Multan.
          </p>
        </div>

        <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-navy-100/40">
          Est. 1992 · Khakwani House, LMQ Road
        </p>
      </section>

      {/* form panel */}
      <section className="flex items-center justify-center bg-cream px-5 py-12">
        <div className="w-full max-w-sm">
          {/* small-screen logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-950 p-1.5">
              <Image
                src="/central-logo-mark.png"
                alt="Central College logo"
                width={36}
                height={36}
                className="h-full w-full object-contain"
              />
            </span>
            <p className="font-display text-lg font-semibold text-navy-900">
              Central College Library
            </p>
          </div>

          <h2 className="font-display text-2xl font-semibold text-navy-900">
            Welcome back
          </h2>
          <p className="mt-1.5 mb-8 text-sm text-ink-mute">
            Sign in to the library management system.
          </p>

          <LoginForm />

          <p className="mt-8 text-center font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ink-mute/70">
            Authorised staff only
          </p>
        </div>
      </section>
    </main>
  );
}
