/**
 * ISBNs are written inconsistently — with hyphens, with spaces, sometimes with
 * a lower-case check character. 978-0-262-03384-8 and 9780262033848 are the
 * same book, so every comparison happens on this normalised form.
 *
 * The database computes the identical value in the generated `isbn_key`
 * column, which the unique index is built over; this is the client-side twin
 * so a duplicate can be spotted before the insert is attempted.
 */
export function normaliseIsbn(raw: string | null | undefined): string | null {
  const key = (raw ?? "").replace(/[^0-9Xx]/g, "").toUpperCase();
  return key === "" ? null : key;
}

/** A plausible ISBN-10 or ISBN-13 — enough to be worth a duplicate lookup. */
export function looksLikeIsbn(raw: string | null | undefined): boolean {
  const key = normaliseIsbn(raw);
  return key !== null && (key.length === 10 || key.length === 13);
}

/**
 * Shelf codes are identifiers, so " cs-a1 " and "CS-A1" are one shelf. Matches
 * the normalisation the book_shelves trigger applies, so the value shown in
 * the interface is the value stored.
 */
export function normaliseShelf(raw: string | null | undefined): string {
  const s = (raw ?? "").trim().toUpperCase();
  return s === "" ? "UNASSIGNED" : s;
}
