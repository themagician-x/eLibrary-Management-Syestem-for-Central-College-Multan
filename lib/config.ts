/** Library circulation rules (moves to a settings table in M7). */
export const LOAN_DAYS = 14;
export const MAX_BOOKS_PER_STUDENT = 3;
export const MAX_RENEWS = 2;

/** Fines (Pakistani Rupees). */
export const FINE_PER_DAY = 5;
export const CURRENCY = "Rs";

export function money(amount: number): string {
  return `${CURRENCY} ${Number(amount).toLocaleString("en-PK")}`;
}
