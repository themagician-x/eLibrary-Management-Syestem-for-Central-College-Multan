"use client";

import { useState } from "react";
import Link from "next/link";
import type { Book } from "@/lib/types";
import DeleteButton from "@/components/DeleteButton";
import TableScroll from "@/components/TableScroll";
import { deleteBook } from "./actions";
import BookDrawer from "./book-drawer";

const COLS = "sm:grid-cols-[1fr_170px_110px_150px_80px]";

export default function BooksTable({ books }: { books: Book[] }) {
  const [selected, setSelected] = useState<Book | null>(null);

  return (
    <>
      <TableScroll
        header={
          <div className={`hidden gap-4 border-b border-mist-deep bg-mist px-5 py-3 font-mono text-[0.6rem] uppercase tracking-wider text-ink-mute sm:grid ${COLS}`}>
            <span>Book</span><span>Category</span><span>Shelf</span><span>Availability</span><span className="text-right">Actions</span>
          </div>
        }
      >
        {books.map((book) => (
          <div
            key={book.id}
            onClick={() => setSelected(book)}
            className={`group grid cursor-pointer grid-cols-[1fr_auto] items-center gap-4 border-b border-mist bg-paper px-5 py-3 transition-colors last:border-0 hover:bg-cream ${COLS}`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-13 w-10 flex-none items-center justify-center overflow-hidden rounded-md border border-mist-deep bg-mist">
                {book.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.cover_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-sm font-semibold text-ink-mute">{book.title.charAt(0)}</span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display font-semibold text-navy-900 group-hover:text-navy-700">{book.title}</span>
                <span className="block truncate text-xs text-ink-mute">{book.author ?? "Unknown author"}</span>
              </span>
            </span>

            <span className="hidden min-w-0 sm:block">
              {book.category ? (
                <span className="block truncate font-mono text-[0.62rem] uppercase tracking-[0.1em] text-gold-700">{book.category}</span>
              ) : (
                <span className="text-sm text-ink-mute">—</span>
              )}
            </span>

            <span className="hidden truncate font-mono text-xs text-ink-soft sm:block">{book.shelf || "—"}</span>

            <span className="hidden sm:block">
              <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${book.available_copies > 0 ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
                {book.available_copies}/{book.total_copies} available
              </span>
            </span>

            <span className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <Link href={`/books/${book.id}/edit`} aria-label={`Edit ${book.title}`} title="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-mute transition-colors hover:bg-mist hover:text-navy-900">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M13.5 6.5l3 3" /></svg>
              </Link>
              <DeleteButton onDelete={() => deleteBook(book.id)} name={`“${book.title}”`} title="Delete book" />
            </span>
          </div>
        ))}
      </TableScroll>

      <BookDrawer book={selected} onClose={() => setSelected(null)} />
    </>
  );
}
