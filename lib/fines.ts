import { money } from "@/lib/config";
import type { Fine } from "@/lib/types";

const DAY = 86_400_000;

/** A fine together with the loan it came from, when there is one. */
export type FineContext = Fine & {
  /** Set directly on the charge; survives the loan being deleted. */
  book?: { id: string; title: string } | null;
  loan:
    | {
        issued_at: string;
        due_at: string;
        returned_at: string | null;
        renew_count?: number;
        book: { id: string; title: string } | null;
      }
    | null;
};

export type FineExplanation = {
  /** What the charge is for, in one line. */
  headline: string;
  /** The arithmetic, when the amount was calculated rather than typed in. */
  formula?: string;
  /** The dates behind it, in order. */
  timeline: { label: string; value: string }[];
  book?: { id: string; title: string } | null;
  note?: string | null;
};

const date = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Turns a fine into something a librarian can read out to a student: which
 * book, which dates, and how the amount was arrived at.
 *
 * The daily rate isn't stored on the fine — settings can change afterwards — so
 * for a late fee it's recovered from the amount and the days it covered, which
 * gives the rate that was actually applied rather than today's.
 */
export function explainFine(fine: FineContext): FineExplanation {
  const loan = fine.loan;
  // prefer the book recorded on the charge itself — a loan can be deleted, and
  // a hand-raised charge may name a book without one
  const book = fine.book ?? loan?.book ?? null;
  const amount = Number(fine.amount);

  const timeline: { label: string; value: string }[] = [];
  if (loan) {
    timeline.push({ label: "Issued", value: date(loan.issued_at) });
    timeline.push({ label: "Due", value: date(loan.due_at) });
    if (loan.returned_at) {
      // a written-off copy never came back — the loan was closed, not returned,
      // so calling that date "Returned" would misdescribe what happened
      timeline.push({
        label: fine.reason === "late" ? "Returned" : "Written off",
        value: date(loan.returned_at),
      });
    }
  }

  if (fine.reason === "late") {
    // days the book was overdue, from the dates on the loan itself
    const days =
      loan?.returned_at && loan.due_at
        ? Math.ceil((new Date(loan.returned_at).getTime() - new Date(loan.due_at).getTime()) / DAY)
        : null;

    if (days && days > 0) {
      const rate = amount / days;
      // whole rupees where the rate divides evenly, otherwise two decimals
      const rateLabel = Number.isInteger(rate) ? money(rate) : money(Number(rate.toFixed(2)));
      return {
        headline: `Returned ${plural(days, "day")} after the due date`,
        formula: `${rateLabel} per day × ${plural(days, "day")} = ${money(amount)}`,
        timeline,
        book,
        note: fine.note,
      };
    }

    return {
      headline: "Late return",
      timeline,
      book,
      note: fine.note,
    };
  }

  // lost / damaged — a replacement charge, not a calculation
  const label = fine.reason === "lost" ? "lost" : "damaged beyond use";
  return {
    headline: loan
      ? `Book ${label} while on loan — replacement charge`
      : `Book ${label} — replacement charge`,
    formula: `Replacement charge ${money(amount)}`,
    timeline,
    book,
    note: fine.note,
  };
}
