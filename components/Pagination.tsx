import Link from "next/link";

/** Rows per page across every list. */
export const PAGE_SIZE = 50;

/** Turn a `?page=` value into a usable page number. */
export function pageFrom(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/** The `.range()` bounds for a page. */
export function rangeFor(page: number, size = PAGE_SIZE): [number, number] {
  const from = (page - 1) * size;
  return [from, from + size - 1];
}

/**
 * 1 … 4 5 [6] 7 8 … 26 — always the first and last page, plus a window around
 * the current one. `null` marks a gap.
 */
function pageList(current: number, last: number): (number | null)[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

  const out: (number | null)[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(last - 1, current + 1);

  if (start > 2) out.push(null);
  for (let p = start; p <= end; p++) out.push(p);
  if (end < last - 1) out.push(null);

  out.push(last);
  return out;
}

const box =
  "flex h-8 min-w-8 items-center justify-center rounded-lg px-2.5 text-sm font-semibold transition-colors";

export default function Pagination({
  page,
  total,
  basePath,
  params = {},
  size = PAGE_SIZE,
  noun = "row",
}: {
  page: number;
  /** Total matching rows, from an exact count — not the length of this page. */
  total: number;
  basePath: string;
  /** Current query string minus `page`, so filters survive a page change. */
  params?: Record<string, string | undefined>;
  size?: number;
  noun?: string;
}) {
  const last = Math.max(1, Math.ceil(total / size));
  const first = total === 0 ? 0 : (page - 1) * size + 1;
  const upTo = Math.min(page * size, total);

  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  // one page of results needs no controls, but the count is still worth stating
  if (last <= 1) {
    return (
      <p className="shrink-0 pt-3 text-xs text-ink-mute">
        {total} {noun}
        {total === 1 ? "" : "s"}
      </p>
    );
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex shrink-0 flex-wrap items-center justify-between gap-3 pt-3"
    >
      <p className="text-xs text-ink-mute tabular-nums">
        Showing {first.toLocaleString()}&ndash;{upTo.toLocaleString()} of{" "}
        {total.toLocaleString()} {noun}
        {total === 1 ? "" : "s"}
      </p>

      <div className="flex flex-wrap items-center gap-1">
        {page > 1 ? (
          <Link href={href(page - 1)} rel="prev" className={`${box} text-ink-soft hover:bg-mist`}>
            &lsaquo; Prev
          </Link>
        ) : (
          <span className={`${box} cursor-default text-ink-mute/50`} aria-disabled="true">
            &lsaquo; Prev
          </span>
        )}

        {pageList(page, last).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="px-1 text-sm text-ink-mute" aria-hidden="true">
              &hellip;
            </span>
          ) : p === page ? (
            <span key={p} aria-current="page" className={`${box} bg-navy-900 text-cream tabular-nums`}>
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={href(p)}
              aria-label={`Page ${p}`}
              className={`${box} text-ink-soft tabular-nums hover:bg-mist`}
            >
              {p}
            </Link>
          )
        )}

        {page < last ? (
          <Link href={href(page + 1)} rel="next" className={`${box} text-ink-soft hover:bg-mist`}>
            Next &rsaquo;
          </Link>
        ) : (
          <span className={`${box} cursor-default text-ink-mute/50`} aria-disabled="true">
            Next &rsaquo;
          </span>
        )}
      </div>
    </nav>
  );
}
