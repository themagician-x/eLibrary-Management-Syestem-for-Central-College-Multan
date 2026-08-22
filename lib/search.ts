/** Most terms one search box accepts at once, comma-separated. */
export const MAX_TERMS = 5;

export type ParsedSearch = {
  /** Cleaned terms, at most MAX_TERMS. Empty when nothing searchable was typed. */
  terms: string[];
  /** Set when the admin typed more than MAX_TERMS — show it, search nothing. */
  error?: string;
};

/**
 * A comma splits the box into separate searches — "Ahmed, Fatima" looks for
 * either. That is also why the term has to be escaped: PostgREST's `or=()`
 * filter is itself comma-delimited, so an unescaped comma used to tear the
 * filter in half and return a 400.
 */
export function parseSearch(raw: string, max = MAX_TERMS): ParsedSearch {
  const terms = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (terms.length > max) {
    return {
      terms: [],
      error: `Search up to ${max} at a time — you entered ${terms.length}. Remove ${terms.length - max} and try again.`,
    };
  }
  return { terms };
}

/**
 * Make a term safe inside a PostgREST `or=(...)` filter.
 *
 * Two layers of syntax to get past. Commas and parentheses belong to the filter
 * itself, so the value is double-quoted. Inside that, `%` and `_` are still SQL
 * LIKE wildcards — left raw, a search for `_` matches every row — so they get a
 * backslash, doubled because PostgREST unescapes once before SQL sees it.
 */
export function escapeTerm(term: string): string {
  const escaped = term
    // a backslash would escape the character after it once SQL sees the
    // pattern, so `a\b` would quietly search for `ab`. Nobody searches a
    // catalogue for a backslash — drop them rather than escape them twice over.
    .replace(/\\/g, "")
    .replace(/([%_])/g, "\\\\$1")
    .replace(/"/g, '\\"');
  return `"*${escaped}*"`;
}

/**
 * Build the `or=(...)` argument matching any of `terms` against any of `columns`.
 * Returns null when there is nothing to search.
 */
export function orFilter(terms: string[], columns: string[]): string | null {
  if (terms.length === 0) return null;
  return terms
    .flatMap((t) => columns.map((c) => `${c}.ilike.${escapeTerm(t)}`))
    .join(",");
}

/**
 * Book picker lookup: fuzzy on the title, plus an exact match on barcode and
 * ISBN when what was typed looks like a scanned code. Restricting the exact
 * columns to digits keeps punctuation out of the `eq` clauses entirely — and a
 * word like "Clean" was never a sensible barcode to test anyway.
 */
export function bookLookup(term: string): string {
  const t = term.trim();
  const clauses = [`title.ilike.${escapeTerm(t)}`];
  if (/^[0-9][0-9-]*$/.test(t)) {
    clauses.push(`barcode.eq.${t}`, `isbn.eq.${t}`);
  }
  return clauses.join(",");
}

/** Student picker lookup: fuzzy on name and roll number. */
export function studentLookup(term: string): string {
  const escaped = escapeTerm(term.trim());
  return `name.ilike.${escaped},roll_no.ilike.${escaped}`;
}
