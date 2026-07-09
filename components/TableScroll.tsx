import type { ReactNode } from "react";

/**
 * Scroll box for a list/table. On desktop (inside a `fill` PageShell) it takes
 * the leftover height and scrolls its own rows under a sticky header, so the
 * page chrome stays put. Below `lg` it just scrolls sideways and the page
 * scrolls as usual.
 *
 * Header rows inside must carry `sticky top-0 z-10` and an opaque background.
 */
export default function TableScroll({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-auto overscroll-contain rounded-2xl border border-mist-deep bg-paper lg:min-h-0 lg:flex-1 ${className}`}
    >
      {children}
    </div>
  );
}
