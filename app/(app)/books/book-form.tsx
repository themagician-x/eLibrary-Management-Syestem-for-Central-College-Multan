"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Book, BookInput } from "@/lib/types";
import type { BookFormState } from "./actions";

const CATEGORIES = [
  "Fiction", "Non-Fiction", "Reference", "Science", "Mathematics",
  "Computer Science", "Physics", "Chemistry", "Biology", "Economics",
  "Commerce", "Accounting", "Law", "Islamic Studies", "Urdu", "English",
  "History", "Geography", "Psychology", "Statistics",
];

type Action = (state: BookFormState, formData: FormData) => Promise<BookFormState>;

const field =
  "w-full rounded-xl border border-mist-deep bg-cream px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-mute/60 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-soft";

export default function BookForm({
  action,
  book,
  submitLabel,
}: {
  action: Action;
  book?: Book;
  submitLabel: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(action, {} as BookFormState);

  const [coverUrl, setCoverUrl] = useState<string | null>(book?.cover_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isbnBusy, setIsbnBusy] = useState(false);
  const [isbnMsg, setIsbnMsg] = useState<string | null>(null);

  function setField(name: string, value: string) {
    const el = formRef.current?.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (el && value) el.value = value;
  }

  async function fetchFromIsbn() {
    const isbnEl = formRef.current?.elements.namedItem("isbn") as HTMLInputElement | null;
    const isbn = isbnEl?.value.trim().replace(/[-\s]/g, "");
    if (!isbn) {
      setIsbnMsg("Enter an ISBN first.");
      return;
    }
    setIsbnBusy(true);
    setIsbnMsg(null);
    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`
      );
      const data = await res.json();
      const info = data.items?.[0]?.volumeInfo;
      if (!info) {
        setIsbnMsg("No match found for that ISBN.");
        return;
      }
      setField("title", info.title ?? "");
      setField("author", (info.authors ?? []).join(", "));
      setField("publisher", info.publisher ?? "");
      setField("published_year", (info.publishedDate ?? "").slice(0, 4));
      setField("category", (info.categories ?? [])[0] ?? "");
      setField("description", info.description ?? "");
      const thumb = info.imageLinks?.thumbnail?.replace("http://", "https://");
      if (thumb && !coverUrl) setCoverUrl(thumb);
      setIsbnMsg("Details filled from Google Books ✓");
    } catch {
      setIsbnMsg("Lookup failed — check your connection.");
    } finally {
      setIsbnBusy(false);
    }
  }

  async function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("book-covers")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("book-covers").getPublicUrl(path);
      setCoverUrl(data.publicUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const v = (k: keyof BookInput) => (book?.[k as keyof Book] ?? "") as string | number;

  return (
    <form ref={formRef} action={formAction} className="grid gap-8 lg:grid-cols-[240px_1fr]">
      {/* cover column */}
      <div>
        <span className={label}>Cover</span>
        <input type="hidden" name="cover_url" value={coverUrl ?? ""} />
        <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl border border-mist-deep bg-mist">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="Cover preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-mute">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m3 15 5-4 4 3 3-2 6 5" /><circle cx="9" cy="9" r="1.5" /></svg>
              <span className="text-xs">No cover</span>
            </div>
          )}
        </div>
        <label className="mt-3 block">
          <span className="flex cursor-pointer items-center justify-center rounded-xl border border-navy-900 px-4 py-2 text-xs font-bold text-navy-900 transition-colors hover:bg-navy-900 hover:text-cream">
            {uploading ? "Uploading…" : coverUrl ? "Change cover" : "Upload cover"}
          </span>
          <input type="file" accept="image/*" onChange={onCoverChange} disabled={uploading} className="hidden" />
        </label>
        {coverUrl && (
          <button type="button" onClick={() => setCoverUrl(null)} className="mt-2 w-full text-center text-xs text-ink-mute hover:text-danger">
            Remove cover
          </button>
        )}
        {uploadError && <p className="mt-2 text-xs text-danger">{uploadError}</p>}
      </div>

      {/* fields column */}
      <div className="space-y-5">
        <div>
          <label className={label} htmlFor="title">Title *</label>
          <input id="title" name="title" required defaultValue={v("title")} placeholder="Book title" className={field} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="author">Author</label>
            <input id="author" name="author" defaultValue={v("author")} placeholder="Author name" className={field} />
          </div>
          <div>
            <label className={label} htmlFor="isbn">ISBN</label>
            <div className="flex gap-2">
              <input id="isbn" name="isbn" defaultValue={v("isbn")} placeholder="978…" className={field} />
              <button type="button" onClick={fetchFromIsbn} disabled={isbnBusy} title="Auto-fill from Google Books" className="flex-none rounded-xl border border-navy-900 px-3 text-xs font-bold text-navy-900 transition-colors hover:bg-navy-900 hover:text-cream disabled:opacity-60">
                {isbnBusy ? "…" : "Fetch"}
              </button>
            </div>
            {isbnMsg && <p className="mt-1 text-[0.7rem] text-ink-mute">{isbnMsg}</p>}
          </div>
          <div>
            <label className={label} htmlFor="publisher">Publisher</label>
            <input id="publisher" name="publisher" defaultValue={v("publisher")} placeholder="Publisher" className={field} />
          </div>
          <div>
            <label className={label} htmlFor="published_year">Year</label>
            <input id="published_year" name="published_year" type="number" min="0" max="2100" defaultValue={v("published_year")} placeholder="2024" className={field} />
          </div>
          <div>
            <label className={label} htmlFor="category">Category</label>
            <input id="category" name="category" list="category-list" defaultValue={v("category")} placeholder="e.g. Computer Science" className={field} />
            <datalist id="category-list">
              {CATEGORIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className={label} htmlFor="language">Language</label>
            <input id="language" name="language" defaultValue={(book?.language ?? "English")} placeholder="English" className={field} />
          </div>
          <div>
            <label className={label} htmlFor="shelf">Shelf location</label>
            <input id="shelf" name="shelf" defaultValue={v("shelf")} placeholder="e.g. Rack A-3" className={field} />
          </div>
          <div>
            <label className={label} htmlFor="total_copies">Copies</label>
            <input id="total_copies" name="total_copies" type="number" min="0" defaultValue={book?.total_copies ?? 1} className={field} />
          </div>
        </div>

        <div>
          <label className={label} htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={3} defaultValue={v("description")} placeholder="Short summary (optional)" className={`${field} resize-y`} />
        </div>

        {state.error && (
          <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {state.error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={pending || uploading} className="rounded-xl bg-navy-900 px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Saving…" : submitLabel}
          </button>
          <button type="button" onClick={() => router.push("/books")} className="rounded-xl px-5 py-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist">
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
