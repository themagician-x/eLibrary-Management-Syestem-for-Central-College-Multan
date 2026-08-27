import { LIBRARY_TZ } from "@/lib/greeting";

/**
 * Report periods, measured in the library's own timezone.
 *
 * "August" has to mean midnight to midnight in Multan, not in UTC. Pinning the
 * boundaries to LIBRARY_TZ is what stops a loan issued at 2am on the 1st from
 * being counted in the previous month — and keeps the answer the same whether
 * the page is rendered on the server in UTC or in the librarian's browser.
 */

export type PeriodKey =
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "this-year"
  | "all"
  | "custom";

export type Period = {
  key: PeriodKey;
  label: string;
  /** Inclusive start as an instant; null for all time. */
  from: Date | null;
  /** Exclusive end as an instant; null for all time. */
  to: Date | null;
  /** The yyyy-mm-dd values the date inputs show. */
  fromDate: string;
  toDate: string;
};

/** How far LIBRARY_TZ is from UTC at a given instant, in milliseconds. */
function offsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LIBRARY_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return asIfUtc - at.getTime();
}

/** The instant at which the given local calendar day begins in LIBRARY_TZ. */
function startOfLocalDay(y: number, m: number, d: number): Date {
  const guess = Date.UTC(y, m, d, 0, 0, 0, 0);
  // one correction is enough for a zone without DST, and Pakistan has none
  return new Date(guess - offsetMs(new Date(guess)));
}

/** Today's calendar date in LIBRARY_TZ, as [year, monthIndex, day]. */
function localToday(now: Date): [number, number, number] {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LIBRARY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = parts.split("-").map(Number);
  return [y, m - 1, d];
}

/** yyyy-mm-dd for a date input, in LIBRARY_TZ. */
function isoDate(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LIBRARY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Parse yyyy-mm-dd as a local calendar day; null if it isn't one. */
function parseDate(value: string | undefined): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value ?? "").trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return [y, mo - 1, d];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * "1 – 31 Jul 2026", dropping whatever the two ends already share, so a range
 * inside one month does not repeat the month and year twice.
 */
function rangeLabel(fromIso: string, toIso: string): string {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const short = (m: number) => MONTHS[m - 1].slice(0, 3);
  if (fy === ty && fm === tm) {
    return fd === td ? `${fd} ${short(fm)} ${fy}` : `${fd} – ${td} ${short(fm)} ${fy}`;
  }
  if (fy === ty) return `${fd} ${short(fm)} – ${td} ${short(tm)} ${fy}`;
  return `${fd} ${short(fm)} ${fy} – ${td} ${short(tm)} ${ty}`;
}

/** Today's calendar date in the library's timezone, as yyyy-mm-dd. */
export function todayInLibrary(now: Date = new Date()): string {
  return isoDate(now);
}

export const PRESETS: { key: PeriodKey; label: string }[] = [
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "last-3-months", label: "Last 3 months" },
  { key: "this-year", label: "This year" },
  { key: "all", label: "All time" },
];

/**
 * Work out the period from the query string. `from`/`to` win when both are
 * present and in order, so a custom range survives a page reload and can be
 * shared as a link; otherwise the named preset applies.
 */
export function resolvePeriod(
  params: { period?: string; from?: string; to?: string },
  now: Date = new Date()
): Period {
  const [ty, tm, td] = localToday(now);

  const customFrom = parseDate(params.from);
  const customTo = parseDate(params.to);
  if (customFrom && customTo) {
    const from = startOfLocalDay(...customFrom);
    // the `to` day is inclusive to the librarian, so end at the next midnight
    const to = startOfLocalDay(customTo[0], customTo[1], customTo[2] + 1);
    if (to > from) {
      const lastDay = isoDate(new Date(to.getTime() - 1));
      return {
        key: "custom",
        label: rangeLabel(isoDate(from), lastDay),
        from,
        to,
        fromDate: isoDate(from),
        toDate: lastDay,
      };
    }
  }

  const key = (PRESETS.find((p) => p.key === params.period)?.key ??
    "this-month") as PeriodKey;

  let from: Date | null = null;
  let to: Date | null = null;
  let label = "All time";

  switch (key) {
    case "this-month":
      from = startOfLocalDay(ty, tm, 1);
      to = startOfLocalDay(ty, tm + 1, 1);
      label = `${MONTHS[tm]} ${ty}`;
      break;
    case "last-month":
      from = startOfLocalDay(ty, tm - 1, 1);
      to = startOfLocalDay(ty, tm, 1);
      label = `${MONTHS[(tm + 11) % 12]} ${tm === 0 ? ty - 1 : ty}`;
      break;
    case "last-3-months":
      from = startOfLocalDay(ty, tm - 2, 1);
      to = startOfLocalDay(ty, tm + 1, 1);
      label = `${MONTHS[(tm + 10) % 12]} to ${MONTHS[tm]} ${ty}`;
      break;
    case "this-year":
      from = startOfLocalDay(ty, 0, 1);
      to = startOfLocalDay(ty + 1, 0, 1);
      label = String(ty);
      break;
    case "all":
    default:
      break;
  }

  return {
    key,
    label,
    from,
    to,
    fromDate: from ? isoDate(from) : "",
    toDate: to ? isoDate(new Date(to.getTime() - 1)) : isoDate(startOfLocalDay(ty, tm, td)),
  };
}
