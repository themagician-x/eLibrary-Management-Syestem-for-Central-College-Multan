"use client";

import { useState } from "react";
import Link from "next/link";
import type { Book } from "@/lib/types";
import DeleteButton from "@/components/DeleteButton";
import { deleteBook } from "./actions";
import BookDrawer from "./book-drawer";

export default function BooksTable({ books }: { books: Book[] }) {
  const [selected, setSelected] = useState<Book | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-mist-deep bg-paper">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-mist-deep bg-mist text-left font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ink-mute">
              <th className="px-4 py-3 font-semibold">Book</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Shelf</th>
              <th className="px-4 py-3 font-semibold">Availability</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr
                key={book.id}
                onClick={() => setSelected(book)}
                className="group cursor-pointer border-b border-mist transition-colors last:border-0 hover:bg-cream"
              >
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
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
                  </div>
                </td>
                <td className="px-4 py-3">
                  {book.category ? (
                    <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-gold-700">{book.category}</span>
                  ) : (
                    <span className="text-ink-mute">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink-soft">{book.shelf || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${book.available_copies > 0 ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
                    {book.available_copies}/{book.total_copies} available
                  </span>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/books/${book.id}/edit`} aria-label={`Edit ${book.title}`} title="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-mute transition-colors hover:bg-mist hover:text-navy-900">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M13.5 6.5l3 3" /></svg>
                    </Link>
                    <DeleteButton onDelete={() => deleteBook(book.id)} name={`“${book.title}”`} title="Delete book" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BookDrawer book={selected} onClose={() => setSelected(null)} />
    </>
  );
}
