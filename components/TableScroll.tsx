import type { ReactNode } from "react";

/**
 * Scroll box for a list. The header sits *outside* the scrolling area, so the
 * scrollbar runs alongside the rows only and never beside the header.
 *
 * On desktop (inside a `fill` PageShell) the box shrinks to fit its rows and
 * only scrolls once they'd overflow the leftover height — a short list keeps a
 * short box. Below `lg` the page scrolls as usual.
 */
export default function TableScroll({
  header,
  children,
  className = "",
}: {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-mist-deep bg-paper ${className}`}>
      {header && <div className="flex-none">{header}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </div>
  );
}
