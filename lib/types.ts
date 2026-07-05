export type Book = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  publisher: string | null;
  published_year: number | null;
  category: string | null;
  language: string;
  description: string | null;
  cover_url: string | null;
  shelf: string | null;
  total_copies: number;
  available_copies: number;
  barcode: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentStatus = "active" | "blocked";

export type Student = {
  id: string;
  name: string;
  roll_no: string | null;
  class_dept: string | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
};

export type Loan = {
  id: string;
  book_id: string;
  student_id: string;
  issued_at: string;
  due_at: string;
  returned_at: string | null;
  renew_count: number;
  created_at: string;
};

/** A loan joined with its book and student, as fetched for display. */
export type LoanWithRefs = Loan & {
  book: Pick<Book, "id" | "title" | "author" | "barcode" | "cover_url"> | null;
  student: Pick<Student, "id" | "name" | "roll_no" | "photo_url"> | null;
};

export type FineReason = "late" | "lost" | "damaged";
export type FineStatus = "unpaid" | "paid" | "waived";

export type Fine = {
  id: string;
  student_id: string;
  loan_id: string | null;
  amount: number;
  reason: FineReason;
  status: FineStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type FineWithRefs = Fine & {
  student: Pick<Student, "id" | "name" | "roll_no" | "photo_url"> | null;
  loan: { book: Pick<Book, "id" | "title"> | null } | null;
};

/** Fields the admin edits in the book form. */
export type BookInput = {
  title: string;
  author?: string;
  isbn?: string;
  publisher?: string;
  published_year?: number | null;
  category?: string;
  language?: string;
  description?: string;
  cover_url?: string | null;
  shelf?: string;
  total_copies?: number;
};
