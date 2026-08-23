import type { ReactNode } from "react";

export default function PageShell({
  title,
  subtitle,
  badge,
  actions,
  fill,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  /**
   * Pin the page to the viewport so a long table scrolls inside its own box,
   * under a header that stays put, instead of scrolling the whole page. Applies
   * at every width — a phone benefits from it more than a desktop does.
   */
  fill?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`mx-auto max-w-6xl px-4 py-4 sm:px-8 sm:py-7 ${
        fill ? "flex h-full flex-col overflow-hidden" : ""
      }`}
    >
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-mist-deep pb-3 flex-none sm:pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
              {title}
            </h1>
            {badge != null && (
              <span className="rounded-full bg-mist px-3 py-1 text-sm font-bold text-ink-soft">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1.5 text-sm text-ink-mute">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <div className={`mt-4 sm:mt-5 ${fill ? "flex min-h-0 flex-1 flex-col" : ""}`}>{children}</div>
    </div>
  );
}
