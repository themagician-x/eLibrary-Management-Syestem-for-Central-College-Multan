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
   * Pin the page to the viewport on desktop so a long table scrolls inside its
   * own box (under a sticky header) instead of scrolling the whole page. Below
   * `lg` the sidebar stacks on top, so the page scrolls normally.
   */
  fill?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10 ${
        fill ? "lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden" : ""
      }`}
    >
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-mist-deep pb-6 lg:flex-none">
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
      <div className={`mt-8 ${fill ? "lg:flex lg:min-h-0 lg:flex-1 lg:flex-col" : ""}`}>{children}</div>
    </div>
  );
}
