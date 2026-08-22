/**
 * The dashboard greeting.
 *
 * The library is in Multan, so the time of day is Multan's — not the browser's
 * and not the server's. Pinning the zone also means the server render and the
 * client render agree exactly, so the heading never flickers on hydration.
 */

export const LIBRARY_TZ = "Asia/Karachi";

export type Greeting = {
  /** Opening clause, set in cream. */
  lead: string;
  /** Closing clause, set in marigold. */
  tail: string;
};

type Band = {
  /** Inclusive first hour, 0–23. */
  from: number;
  phrases: Greeting[];
};

/** Ordered by `from`; the last band that has started wins. */
const BANDS: Band[] = [
  {
    from: 0,
    phrases: [
      { lead: "Burning the midnight oil,", tail: "the shelves are quiet." },
      { lead: "Still up?", tail: "The catalogue never closes." },
      { lead: "Late shift,", tail: "let's leave the desk tidy." },
    ],
  },
  {
    from: 5,
    phrases: [
      { lead: "Up before the bell,", tail: "let's open clean." },
      { lead: "Early start,", tail: "the shelves are yours." },
    ],
  },
  {
    from: 8,
    phrases: [
      { lead: "Good morning,", tail: "let's get the desk ready." },
      { lead: "Good morning,", tail: "returns first, then the rest." },
      { lead: "Morning,", tail: "the queue is all yours." },
    ],
  },
  {
    from: 12,
    phrases: [
      { lead: "Good afternoon,", tail: "the lunch rush begins." },
      { lead: "Good afternoon,", tail: "let's keep the queue short." },
    ],
  },
  {
    from: 15,
    phrases: [
      { lead: "Good afternoon,", tail: "steady as she goes." },
      { lead: "Good afternoon,", tail: "time to chase the overdues." },
    ],
  },
  {
    from: 17,
    phrases: [
      { lead: "Good evening,", tail: "let's wrap up strong." },
      { lead: "Good evening,", tail: "last returns of the day." },
    ],
  },
  {
    from: 21,
    phrases: [
      { lead: "Winding down,", tail: "shelves back in order." },
      { lead: "Good evening,", tail: "one last pass before closing." },
    ],
  },
];

/** Calendar fields as they read in Multan, whatever zone the clock is in. */
function zoned(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LIBRARY_TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
  }).formatToParts(date);

  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // some ICU builds render midnight as hour 24
  return { year: num("year"), month: num("month"), day: num("day"), hour: num("hour") % 24 };
}

/**
 * A greeting for this moment. The band follows the clock; the phrase inside it
 * rotates by hour and by date, so it reads differently through the day and
 * differently tomorrow — without ever being random, which would not survive
 * hydration.
 */
export function greetingAt(date: Date): Greeting {
  const { year, month, day, hour } = zoned(date);

  let band = BANDS[0];
  for (const b of BANDS) if (hour >= b.from) band = b;

  const seed = year * 372 + month * 31 + day + hour;
  return band.phrases[seed % band.phrases.length];
}

/** "SAT, AUG 22, 6:47 PM" */
export function stampAt(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: LIBRARY_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
    .format(date)
    .toUpperCase();
}
