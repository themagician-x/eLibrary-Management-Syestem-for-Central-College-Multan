"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Select from "@/components/Select";
import { useModal, useBeforeUnload } from "@/components/unsaved";
import type { Student } from "@/lib/types";
import type { StudentFormState } from "./actions";

type Action = (state: StudentFormState, formData: FormData) => Promise<StudentFormState>;

const field =
  "w-full rounded-xl border border-mist-deep bg-cream px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-mute/60 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-soft";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}

export default function StudentForm({
  action,
  student,
  submitLabel,
}: {
  action: Action;
  student?: Student;
  submitLabel: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, {} as StudentFormState);

  const [photoUrl, setPhotoUrl] = useState<string | null>(student?.photo_url ?? null);
  const [name, setName] = useState(student?.name ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { setDirty: setDirtyCtx, close } = useModal();
  const [dirty, setDirty] = useState(false);
  useBeforeUnload(dirty);
  const markDirty = () => {
    if (!dirty) {
      setDirty(true);
      setDirtyCtx(true);
    }
  };
  const clearDirty = () => {
    setDirty(false);
    setDirtyCtx(false);
  };

  useEffect(() => {
    if (state.ok) {
      setDirtyCtx(false);
      if (close) close();
      else router.push("/students");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    markDirty();
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("student-photos").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("student-photos").getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const v = (k: keyof Student) => (student?.[k] ?? "") as string;

  return (
    <form action={formAction} onInput={markDirty} onSubmit={clearDirty} className="grid gap-8 lg:grid-cols-[200px_1fr]">
      {/* photo column */}
      <div>
        <span className={label}>Photo</span>
        <input type="hidden" name="photo_url" value={photoUrl ?? ""} />
        <div className="mx-auto flex aspect-square w-40 items-center justify-center overflow-hidden rounded-full border border-mist-deep bg-navy-900 lg:mx-0">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-4xl font-semibold text-gold-400">{initials(name)}</span>
          )}
        </div>
        <label className="mt-3 block">
          <span className="flex cursor-pointer items-center justify-center rounded-xl border border-navy-900 px-4 py-2 text-xs font-bold text-navy-900 transition-colors hover:bg-navy-900 hover:text-cream">
            {uploading ? "Uploading…" : photoUrl ? "Change photo" : "Upload photo"}
          </span>
          <input type="file" accept="image/*" onChange={onPhotoChange} disabled={uploading} className="hidden" />
        </label>
        {photoUrl && (
          <button type="button" onClick={() => setPhotoUrl(null)} className="mt-2 w-full text-center text-xs text-ink-mute hover:text-danger">
            Remove photo
          </button>
        )}
        {uploadError && <p className="mt-2 text-xs text-danger">{uploadError}</p>}
      </div>

      {/* fields column */}
      <div className="space-y-5">
        <div>
          <label className={label} htmlFor="name">Full name *</label>
          <input id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Student name" className={field} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="roll_no">Roll number</label>
            <input id="roll_no" name="roll_no" defaultValue={v("roll_no")} placeholder="e.g. 2024-CS-014" className={field} />
          </div>
          <div>
            <label className={label} htmlFor="class_dept">Class / Department</label>
            <input id="class_dept" name="class_dept" defaultValue={v("class_dept")} placeholder="e.g. BS Computer Science" className={field} />
          </div>
          <div>
            <label className={label} htmlFor="email">Email</label>
            <input id="email" name="email" type="email" defaultValue={v("email")} placeholder="student@example.com" className={field} />
          </div>
          <div>
            <label className={label} htmlFor="phone">Phone</label>
            <input id="phone" name="phone" defaultValue={v("phone")} placeholder="03xx-xxxxxxxx" className={field} />
          </div>
          <div>
            <label className={label} htmlFor="status">Status</label>
            <Select
              id="status"
              name="status"
              ariaLabel="Status"
              defaultValue={student?.status ?? "active"}
              options={[
                { value: "active", label: "Active" },
                { value: "blocked", label: "Blocked" },
              ]}
            />
          </div>
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
          <button type="button" onClick={() => (close ? close() : router.push("/students"))} className="rounded-xl px-5 py-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist">
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
