// Seeds the app with a realistic demo library.
// Run: node --env-file=.env.local scripts/seed-demo.mjs
// WARNING: clears existing books/students/loans/fines/reservations first.
const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const S = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!U || !S) { console.error("Missing env — run with --env-file=.env.local"); process.exit(1); }
const H = { apikey: S, Authorization: "Bearer " + S, "Content-Type": "application/json", Prefer: "return=representation" };
const rest = (p, o = {}) => fetch(`${U}/rest/v1/${p}`, { headers: H, ...o });
const DAY = 86_400_000;
const iso = (ms) => new Date(ms).toISOString();
let bcn = 2000000000000;
const bc = () => String(++bcn);
const cover = (isbn) => `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;

// ---------- clear ----------
console.log("Clearing existing data…");
for (const t of ["reservations", "fines", "loans", "books", "students"]) {
  await rest(`${t}?id=not.is.null`, { method: "DELETE" });
}
await rest("settings?id=eq.1", { method: "PATCH", body: JSON.stringify({ loan_days: 14, max_books: 3, max_renews: 2, fine_per_day: 5 }) });

// ---------- books ----------
const BOOKS = [
  ["Introduction to Algorithms", "Thomas H. Cormen", "9780262033848", "Computer Science", "MIT Press", 2009, 3, "CS-A1"],
  ["Clean Code", "Robert C. Martin", "9780132350884", "Computer Science", "Prentice Hall", 2008, 2, "CS-A2"],
  ["The C Programming Language", "Kernighan & Ritchie", "9780131103627", "Computer Science", "Prentice Hall", 1988, 2, "CS-A3"],
  ["Database System Concepts", "Abraham Silberschatz", "9780073523323", "Computer Science", "McGraw-Hill", 2010, 2, "CS-B1"],
  ["Operating System Concepts", "Abraham Silberschatz", "9781118063330", "Computer Science", "Wiley", 2012, 2, "CS-B2"],
  ["Fundamentals of Physics", "David Halliday", "9781118230718", "Physics", "Wiley", 2013, 3, "PH-A1"],
  ["A Brief History of Time", "Stephen Hawking", "9780553380163", "Physics", "Bantam", 1998, 2, "PH-A2"],
  ["Calculus", "James Stewart", "9781285740621", "Mathematics", "Cengage", 2015, 2, "MA-A1"],
  ["Linear Algebra Done Right", "Sheldon Axler", "9783319110790", "Mathematics", "Springer", 2015, 1, "MA-A2"],
  ["To Kill a Mockingbird", "Harper Lee", "9780061120084", "Literature", "Harper Perennial", 2006, 2, "LT-A1"],
  ["1984", "George Orwell", "9780451524935", "Literature", "Signet Classics", 1961, 3, "LT-A2"],
  ["Sapiens: A Brief History of Humankind", "Yuval Noah Harari", "9780062316097", "History", "Harper", 2015, 2, "HI-A1"],
  ["The Wealth of Nations", "Adam Smith", "9780199535927", "Economics", "Oxford", 2008, 1, "EC-A1"],
  ["Principles of Economics", "N. Gregory Mankiw", "9781305585126", "Economics", "Cengage", 2016, 2, "EC-A2"],
  ["Ar-Raheeq Al-Makhtum (The Sealed Nectar)", "S. R. Mubarakpuri", "9789960899558", "Islamic Studies", "Darussalam", 2002, 2, "IS-A1"],
];
const bookRows = BOOKS.map(([title, author, isbn, category, publisher, year, copies, shelf]) => ({
  title, author, isbn, category, publisher, published_year: year, language: "English",
  total_copies: copies, available_copies: copies, shelf, barcode: bc(), cover_url: cover(isbn),
}));
const books = await (await rest("books", { method: "POST", body: JSON.stringify(bookRows) })).json();
const bookId = Object.fromEntries(books.map((b) => [b.title, b.id]));
const avail = Object.fromEntries(books.map((b) => [b.title, b.total_copies]));
console.log(`Inserted ${books.length} books.`);

// ---------- students ----------
const STUDENTS = [
  ["Ahmed Raza", "2023-CS-001", "BS Computer Science", "ahmed.raza@students.central.edu.pk", "0300-1234567", "active"],
  ["Fatima Noor", "2023-CS-002", "BS Computer Science", "fatima.noor@students.central.edu.pk", "0301-2345678", "active"],
  ["Bilal Hussain", "2022-PHY-014", "BS Physics", "bilal.hussain@students.central.edu.pk", "0302-3456789", "active"],
  ["Ayesha Siddiqui", "2023-MATH-007", "BS Mathematics", "ayesha.siddiqui@students.central.edu.pk", "0303-4567890", "active"],
  ["Usman Ali", "2021-CS-045", "BS Computer Science", "usman.ali@students.central.edu.pk", "0304-5678901", "active"],
  ["Zainab Malik", "2023-ECO-011", "BS Economics", "zainab.malik@students.central.edu.pk", "0305-6789012", "active"],
  ["Hamza Sheikh", "2022-CS-033", "BS Computer Science", "hamza.sheikh@students.central.edu.pk", "0306-7890123", "active"],
  ["Maryam Khan", "2023-ENG-005", "BA English", "maryam.khan@students.central.edu.pk", "0307-8901234", "active"],
  ["Omar Farooq", "2020-CS-088", "BS Computer Science", "omar.farooq@students.central.edu.pk", "0308-9012345", "blocked"],
  ["Sana Tariq", "2023-PHY-019", "BS Physics", "sana.tariq@students.central.edu.pk", "0309-0123456", "active"],
];
const studentRows = STUDENTS.map(([name, roll_no, class_dept, email, phone, status]) => ({ name, roll_no, class_dept, email, phone, status }));
const students = await (await rest("students", { method: "POST", body: JSON.stringify(studentRows) })).json();
const studId = Object.fromEntries(students.map((s) => [s.roll_no, s.id]));
console.log(`Inserted ${students.length} students.`);

// ---------- loans ----------
const now = Date.now();
const active = [
  ["Introduction to Algorithms", "2023-CS-001", 10, 0],
  ["Clean Code", "2023-CS-002", 5, 1],
  ["Fundamentals of Physics", "2022-PHY-014", 12, 0],
  ["Sapiens: A Brief History of Humankind", "2021-CS-045", -4, 0],
  ["1984", "2023-ECO-011", -2, 0],
  ["Linear Algebra Done Right", "2023-MATH-007", 7, 0],
];
const returned = [
  ["Introduction to Algorithms", "2023-CS-002", 40, 26],
  ["Introduction to Algorithms", "2022-CS-033", 60, 47],
  ["1984", "2023-ENG-005", 30, 18],
  ["1984", "2023-CS-001", 55, 45],
  ["Clean Code", "2021-CS-045", 25, 12],
  ["Sapiens: A Brief History of Humankind", "2023-CS-002", 35, 20],
  ["A Brief History of Time", "2023-PHY-019", 20, 8],
  ["To Kill a Mockingbird", "2023-ENG-005", 22, 15],
  ["Fundamentals of Physics", "2023-PHY-019", 45, 33],
  ["The C Programming Language", "2023-CS-001", 28, 16],
];
const loanRows = [];
for (const [title, roll, dueInDays, renew] of active) {
  const due = now + dueInDays * DAY;
  loanRows.push({ book_id: bookId[title], student_id: studId[roll], issued_at: iso(due - 14 * DAY), due_at: iso(due), renew_count: renew });
  avail[title] -= 1;
}
for (const [title, roll, issuedAgo, returnedAgo] of returned) {
  const issued = now - issuedAgo * DAY;
  loanRows.push({ book_id: bookId[title], student_id: studId[roll], issued_at: iso(issued), due_at: iso(issued + 14 * DAY), returned_at: iso(now - returnedAgo * DAY) });
}
await rest("loans", { method: "POST", body: JSON.stringify(loanRows) });
// reconcile availability for books with active loans
for (const title of new Set(active.map((a) => a[0]))) {
  await rest(`books?id=eq.${bookId[title]}`, { method: "PATCH", body: JSON.stringify({ available_copies: avail[title] }) });
}
console.log(`Inserted ${loanRows.length} loans (${active.length} active, ${returned.length} returned).`);

// ---------- fines ----------
const fines = [
  { student_id: studId["2020-CS-088"], amount: 1500, reason: "lost", status: "unpaid", note: "Lost: Operating System Concepts" },
  { student_id: studId["2021-CS-045"], amount: 20, reason: "late", status: "unpaid", note: "4 day(s) late" },
  { student_id: studId["2023-CS-002"], amount: 15, reason: "late", status: "paid", note: "3 day(s) late" },
  { student_id: studId["2023-ENG-005"], amount: 200, reason: "damaged", status: "waived", note: "Torn pages, waived" },
];
await rest("fines", { method: "POST", body: JSON.stringify(fines) });
console.log(`Inserted ${fines.length} fines.`);

// ---------- reservations ----------
const reservations = [
  { book_id: bookId["Linear Algebra Done Right"], student_id: studId["2022-CS-033"], status: "waiting", created_at: iso(now - 2 * DAY) },
  { book_id: bookId["Linear Algebra Done Right"], student_id: studId["2023-CS-001"], status: "waiting", created_at: iso(now - 1 * DAY) },
  { book_id: bookId["The Wealth of Nations"], student_id: studId["2023-PHY-019"], status: "ready", ready_at: iso(now - 6 * 3600 * 1000) },
];
await rest("reservations", { method: "POST", body: JSON.stringify(reservations) });
console.log(`Inserted ${reservations.length} reservations.`);

console.log("\n✅ Demo data seeded.");
