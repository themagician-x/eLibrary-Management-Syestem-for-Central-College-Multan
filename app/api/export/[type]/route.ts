import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Col = { key: string; header: string; get?: (row: Record<string, unknown>) => unknown };

const EXPORTS: Record<string, { select: string; cols: Col[] }> = {
  books: {
    select: "title,author,isbn,publisher,published_year,category,language,shelf,total_copies,available_copies,barcode",
    cols: [
      { key: "title", header: "Title" }, { key: "author", header: "Author" },
      { key: "isbn", header: "ISBN" }, { key: "publisher", header: "Publisher" },
      { key: "published_year", header: "Year" }, { key: "category", header: "Category" },
      { key: "language", header: "Language" }, { key: "shelf", header: "Shelf" },
      { key: "total_copies", header: "Total copies" }, { key: "available_copies", header: "Available" },
      { key: "barcode", header: "Barcode" },
    ],
  },
  students: {
    select: "name,roll_no,class_dept,email,phone,status,created_at",
    cols: [
      { key: "name", header: "Name" }, { key: "roll_no", header: "Roll no" },
      { key: "class_dept", header: "Class / Dept" }, { key: "email", header: "Email" },
      { key: "phone", header: "Phone" }, { key: "status", header: "Status" },
      { key: "created_at", header: "Registered" },
    ],
  },
  loans: {
    select: "issued_at,due_at,returned_at,renew_count,book:books(title),student:students(name,roll_no)",
    cols: [
      { key: "book", header: "Book", get: (r) => (r.book as { title?: string })?.title },
      { key: "student", header: "Student", get: (r) => (r.student as { name?: string })?.name },
      { key: "roll", header: "Roll no", get: (r) => (r.student as { roll_no?: string })?.roll_no },
      { key: "issued_at", header: "Issued" }, { key: "due_at", header: "Due" },
      { key: "returned_at", header: "Returned" }, { key: "renew_count", header: "Renewals" },
    ],
  },
  fines: {
    select: "amount,reason,status,note,created_at,student:students(name,roll_no)",
    cols: [
      { key: "student", header: "Student", get: (r) => (r.student as { name?: string })?.name },
      { key: "roll", header: "Roll no", get: (r) => (r.student as { roll_no?: string })?.roll_no },
      { key: "amount", header: "Amount" }, { key: "reason", header: "Reason" },
      { key: "status", header: "Status" }, { key: "note", header: "Note" },
      { key: "created_at", header: "Date" },
    ],
  },
};

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const spec = EXPORTS[type];
  if (!spec) return NextResponse.json({ error: "Unknown export" }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const table = type === "loans" ? "loans" : type === "fines" ? "fines" : type;
  const { data, error } = await supabase.from(table).select(spec.select).order("created_at", { ascending: false }).limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const header = spec.cols.map((c) => csvCell(c.header)).join(",");
  const body = rows.map((r) => spec.cols.map((c) => csvCell(c.get ? c.get(r) : r[c.key])).join(",")).join("\n");
  const csv = header + "\n" + body;

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="central-library-${type}-${date}.csv"`,
    },
  });
}
