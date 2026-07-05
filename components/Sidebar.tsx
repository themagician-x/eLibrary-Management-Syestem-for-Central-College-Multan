"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { nav } from "@/lib/nav";
import { logout } from "@/app/(app)/actions";

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // mobile drawer

  const NavList = (
    <nav className="flex-1 space-y-1 px-3" aria-label="Sections">
      {nav.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? "bg-navy-800 text-cream"
                : "text-navy-100/70 hover:bg-navy-800/60 hover:text-cream"
            }`}
          >
            <span className={`h-5 w-5 flex-none ${active ? "text-gold-400" : "text-navy-100/50 group-hover:text-gold-400"}`}>
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.milestone && !active && (
              <span className="rounded-full bg-navy-800 px-1.5 py-0.5 font-mono text-[0.55rem] tracking-wider text-navy-100/45">
                {item.milestone}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const Brand = (
    <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3 px-5 py-5">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-cream p-1.5">
        <Image src="/central-logo-mark.png" alt="" width={34} height={34} className="h-full w-full object-contain" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-[0.98rem] font-semibold text-cream">Central Library</span>
        <span className="block font-mono text-[0.55rem] uppercase tracking-[0.2em] text-navy-100/50">Management System</span>
      </span>
    </Link>
  );

  const Account = (
    <div className="border-t border-navy-800/70 p-3">
      <div className="flex items-center gap-3 rounded-xl px-3 py-2">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gold-500 font-display text-xs font-bold text-navy-950">
          {email.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-cream">{email}</span>
          <span className="block font-mono text-[0.55rem] uppercase tracking-wider text-navy-100/45">Administrator</span>
        </span>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-navy-100/70 transition-colors hover:bg-navy-800/60 hover:text-cream"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 8l-4 4 4 4M6 12h9" />
          </svg>
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-mist-deep bg-paper px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-950 p-1.5">
            <Image src="/central-logo-mark.png" alt="" width={28} height={28} className="h-full w-full object-contain" />
          </span>
          <span className="font-display text-sm font-semibold text-navy-900">Central Library</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-900 hover:bg-mist"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </header>

      {/* desktop sidebar */}
      <aside className="crest-lines sticky top-0 hidden h-dvh w-64 flex-none flex-col bg-navy-950 lg:flex">
        {Brand}
        {NavList}
        {Account}
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="crest-lines absolute left-0 top-0 flex h-full w-72 flex-col bg-navy-950">
            <div className="flex items-center justify-between pr-3">
              {Brand}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-100/70 hover:bg-navy-800">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            {NavList}
            {Account}
          </aside>
        </div>
      )}
    </>
  );
}
