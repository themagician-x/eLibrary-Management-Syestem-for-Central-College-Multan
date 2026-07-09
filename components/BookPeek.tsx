"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Book } from "@/lib/types";
import BookDrawer from "@/app/(app)/books/book-drawer";

/**
 * Clickable book cell that opens the book detail drawer in place (instead of
 * navigating to the book page). Fetches the full row on click since callers
 * usually only have a partial book reference.
 */
export default function BookPeek({
  bookId,
  className,
  children,
}: {
  bookId?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const [book, setBook] = useState<Book | null>(null);

  async function open() {
    if (!bookId) return;
    const supabase = createClient();
    const { data } = await supabase.from("books").select("*").eq("id", bookId).single();
    if (data) setBook(data as Book);
  }

  return (
    <>
      <button type="button" onClick={open} disabled={!bookId} className={`cursor-pointer disabled:cursor-default ${className ?? ""}`}>
        {children}
      </button>
      <BookDrawer book={book} onClose={() => setBook(null)} />
    </>
  );
}
