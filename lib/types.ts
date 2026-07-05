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
