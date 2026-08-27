// Seeds the app with a realistic demo library — enough in every section that
// each screen has something to show.
// Run: node --env-file=.env.local scripts/seed-demo.mjs
// WARNING: clears existing books/students/loans/fines/reservations/write-offs.
const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const S = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!U || !S) { console.error("Missing env — run with --env-file=.env.local"); process.exit(1); }
const H = { apikey: S, Authorization: "Bearer " + S, "Content-Type": "application/json", Prefer: "return=representation" };
const rest = (p, o = {}) => fetch(`${U}/rest/v1/${p}`, { headers: H, ...o });

/** POST that refuses to fail quietly — a silent insert error leaves a half-seeded demo. */
async function insert(table, rows) {
  const r = await rest(table, { method: "POST", body: JSON.stringify(rows) });
  if (!r.ok) {
    console.error(`\n❌ inserting into ${table} failed (HTTP ${r.status}):\n   ${await r.text()}`);
    process.exit(1);
  }
  return r.json();
}
const DAY = 86_400_000;
const iso = (ms) => new Date(ms).toISOString();
let bcn = 2000000000000;
const bc = () => String(++bcn);
const cover = (isbn) => `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
const money = (n) => `Rs ${Number(n).toLocaleString("en-PK")}`;

// ---------- clear ----------
console.log("Clearing existing data…");
for (const t of ["write_offs", "reservations", "fines", "loans", "books", "students"]) {
  await rest(`${t}?id=not.is.null`, { method: "DELETE" });
}

// The library's own rules are left alone — the demo is built around whatever
// is configured, so a seeded late fee always matches the rate on screen.
const settings = (await (await rest("settings?select=*")).json())[0];
const { loan_days: LOAN_DAYS, fine_per_day: RATE } = settings;
console.log(`Using the configured rules: ${LOAN_DAYS}-day loans, ${money(RATE)}/day late fee.`);

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

// The rest of the shelves. No ISBN or cover art — the same way a real
// catalogue looks before someone gets round to adding them.
const MORE = [
  ["Artificial Intelligence: A Modern Approach", "Stuart Russell", "Computer Science", 3, "CS-C1"],
  ["Computer Networks", "Andrew S. Tanenbaum", "Computer Science", 2, "CS-C2"],
  ["Design Patterns", "Erich Gamma", "Computer Science", 2, "CS-C3"],
  ["The Pragmatic Programmer", "Andrew Hunt", "Computer Science", 2, "CS-C4"],
  ["Structure and Interpretation of Computer Programs", "Harold Abelson", "Computer Science", 1, "CS-D1"],
  ["Compilers: Principles, Techniques and Tools", "Alfred V. Aho", "Computer Science", 2, "CS-D2"],
  ["Computer Organization and Design", "David A. Patterson", "Computer Science", 2, "CS-D3"],
  ["Software Engineering", "Ian Sommerville", "Computer Science", 3, "CS-D4"],
  ["Discrete Mathematics and Its Applications", "Kenneth H. Rosen", "Mathematics", 3, "MA-B1"],
  ["Elementary Differential Equations", "William E. Boyce", "Mathematics", 2, "MA-B2"],
  ["Principles of Mathematical Analysis", "Walter Rudin", "Mathematics", 1, "MA-B3"],
  ["A First Course in Probability", "Sheldon Ross", "Mathematics", 2, "MA-B4"],
  ["Introduction to Statistical Learning", "Gareth James", "Statistics", 2, "ST-A1"],
  ["Statistics for Business and Economics", "Paul Newbold", "Statistics", 2, "ST-A2"],
  ["University Physics", "Hugh D. Young", "Physics", 3, "PH-B1"],
  ["Introduction to Electrodynamics", "David J. Griffiths", "Physics", 2, "PH-B2"],
  ["Concepts of Modern Physics", "Arthur Beiser", "Physics", 2, "PH-B3"],
  ["Classical Mechanics", "Herbert Goldstein", "Physics", 1, "PH-B4"],
  ["Organic Chemistry", "Paula Y. Bruice", "Chemistry", 3, "CH-A1"],
  ["Chemical Principles", "Peter Atkins", "Chemistry", 2, "CH-A2"],
  ["Inorganic Chemistry", "Catherine Housecroft", "Chemistry", 2, "CH-A3"],
  ["Campbell Biology", "Lisa A. Urry", "Biology", 3, "BI-A1"],
  ["Molecular Biology of the Cell", "Bruce Alberts", "Biology", 2, "BI-A2"],
  ["Human Anatomy and Physiology", "Elaine N. Marieb", "Biology", 2, "BI-A3"],
  ["Macroeconomics", "N. Gregory Mankiw", "Economics", 3, "EC-B1"],
  ["Development Economics", "Debraj Ray", "Economics", 2, "EC-B2"],
  ["Financial Accounting", "Jerry J. Weygandt", "Accounting", 3, "AC-A1"],
  ["Cost Accounting", "Charles T. Horngren", "Accounting", 2, "AC-A2"],
  ["Principles of Marketing", "Philip Kotler", "Commerce", 3, "CO-A1"],
  ["Business Law", "Henry R. Cheeseman", "Law", 2, "LW-A1"],
  ["Constitution of Pakistan: A Commentary", "Hamid Khan", "Law", 2, "LW-A2"],
  ["Introduction to Psychology", "James W. Kalat", "Psychology", 3, "PS-A1"],
  ["Social Psychology", "Elliot Aronson", "Psychology", 2, "PS-A2"],
  ["The Story of Pakistan", "Aitzaz Ahsan", "History", 2, "HI-B1"],
  ["A History of the Muslim World", "Vernon O. Egger", "History", 2, "HI-B2"],
  ["Fiqh us-Sunnah", "Sayyid Sabiq", "Islamic Studies", 2, "IS-A2"],
  ["Tafsir Ibn Kathir (Abridged)", "Ibn Kathir", "Islamic Studies", 3, "IS-A3"],
  ["Bang-e-Dra", "Allama Iqbal", "Urdu", 3, "UR-A1"],
  ["Aab-e-Gum", "Mushtaq Ahmed Yousufi", "Urdu", 2, "UR-A2"],
  ["Deewan-e-Ghalib", "Mirza Ghalib", "Urdu", 2, "UR-A3"],
  ["Pride and Prejudice", "Jane Austen", "Literature", 2, "LT-B1"],
  ["Things Fall Apart", "Chinua Achebe", "Literature", 2, "LT-B2"],
  ["The Old Man and the Sea", "Ernest Hemingway", "Literature", 2, "LT-B3"],
  ["Practical English Usage", "Michael Swan", "English", 3, "EN-A1"],
  ["The Elements of Style", "William Strunk Jr.", "English", 2, "EN-A2"],
];
// shelf and copies are no longer columns on the book: copies live on
// book_shelves, and books.total_copies is derived from them by trigger
const placements = [
  ...BOOKS.map(([title, , , , , , copies, shelf]) => ({ title, copies, shelf })),
  ...MORE.map(([title, , , copies, shelf]) => ({ title, copies, shelf })),
];
const bookRows = [
  ...BOOKS.map(([title, author, isbn, category, publisher, year]) => ({
    title, author, isbn, category, publisher, published_year: year, language: "English",
    barcode: bc(), cover_url: cover(isbn),
  })),
  ...MORE.map(([title, author, category]) => ({
    title, author, isbn: null, category, publisher: null, published_year: null,
    language: "English", barcode: bc(), cover_url: null,
  })),
];
const books = await insert("books", bookRows);
const bookId = Object.fromEntries(books.map((b) => [b.title, b.id]));
console.log(`Inserted ${books.length} books.`);

// A couple of titles are split across two racks, so the demo shows the case
// the single-shelf model could not record.
const SPLIT = { "Introduction to Algorithms": "CS-D1", "Fundamentals of Physics": "PH-C1" };
const shelfRows = [];
for (const { title, copies, shelf } of placements) {
  const id = bookId[title];
  if (!id || copies < 1) continue;
  const overflow = SPLIT[title] && copies > 1 ? Math.floor(copies / 2) : 0;
  shelfRows.push({ book_id: id, shelf, copies: copies - overflow });
  if (overflow) shelfRows.push({ book_id: id, shelf: SPLIT[title], copies: overflow });
}
await insert("book_shelves", shelfRows);
console.log(`Placed copies across ${shelfRows.length} shelf entries.`);

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
  ["Hassan Javed", "2022-MATH-021", "BS Mathematics", "hassan.javed@students.central.edu.pk", "0310-1234501", "active"],
  ["Iqra Aslam", "2023-CHEM-004", "BS Chemistry", "iqra.aslam@students.central.edu.pk", "0311-2345602", "active"],
  ["Bilquis Bano", "2022-BIO-017", "BS Biology", "bilquis.bano@students.central.edu.pk", "0312-3456703", "active"],
  ["Talha Mehmood", "2021-ECO-030", "BS Economics", "talha.mehmood@students.central.edu.pk", "0313-4567804", "active"],
  ["Nimra Shahid", "2023-ENG-012", "BA English", "nimra.shahid@students.central.edu.pk", "0314-5678905", "active"],
  ["Saad Qureshi", "2022-CS-052", "BS Computer Science", "saad.qureshi@students.central.edu.pk", "0315-6789006", "active"],
  ["Hina Rafiq", "2023-PSY-008", "BS Psychology", "hina.rafiq@students.central.edu.pk", "0316-7890107", "active"],
  ["Danish Iqbal", "2021-COM-063", "B.Com", "danish.iqbal@students.central.edu.pk", "0317-8901208", "blocked"],
  ["Areeba Nawaz", "2023-MATH-015", "BS Mathematics", "areeba.nawaz@students.central.edu.pk", "0318-9012309", "active"],
  ["Kashif Anwar", "2022-PHY-026", "BS Physics", "kashif.anwar@students.central.edu.pk", "0319-0123410", "active"],
  ["Rimsha Yousaf", "2023-URD-003", "BA Urdu", "rimsha.yousaf@students.central.edu.pk", "0320-1234511", "active"],
  ["Ali Hamza", "2020-LAW-009", "LLB", "ali.hamza@students.central.edu.pk", "0321-2345612", "active"],
];
const studentRows = STUDENTS.map(([name, roll_no, class_dept, email, phone, status]) => ({ name, roll_no, class_dept, email, phone, status }));
const students = await insert("students", studentRows);
const studId = Object.fromEntries(students.map((s) => [s.roll_no, s.id]));
console.log(`Inserted ${students.length} students.`);

// ---------- loans ----------
const now = Date.now();

// on loan now — a spread of due dates so Circulation shows every state
const active = [
  ["Introduction to Algorithms",              "2023-CS-001",   -12, 0],
  ["Clean Code",                              "2023-CS-002",    -5, 1],
  ["Fundamentals of Physics",                 "2022-PHY-014",   -1, 0],
  ["Artificial Intelligence: A Modern Approach", "2022-CS-052",   0, 0],
  ["Linear Algebra Done Right",               "2023-MATH-007",   2, 0],
  ["Campbell Biology",                        "2022-BIO-017",    6, 2],
  ["Organic Chemistry",                       "2023-CHEM-004",  11, 0],
  ["Bang-e-Dra",                              "2023-URD-003",   13, 0],
  ["Macroeconomics",                          "2021-ECO-030",    9, 1],
  ["Introduction to Psychology",              "2023-PSY-008",    4, 0],
];

// returned — [title, roll, issued how many days ago, days late (0 = on time)]
const returned = [
  ["Introduction to Algorithms",  "2023-CS-002",   40, 4],
  ["Introduction to Algorithms",  "2022-CS-033",   60, 0],
  ["1984",                        "2023-ENG-005",  30, 0],
  ["1984",                        "2023-CS-001",   55, 7],
  ["Clean Code",                  "2021-CS-045",   25, 0],
  ["Sapiens: A Brief History of Humankind", "2023-CS-002", 35, 2],
  ["A Brief History of Time",     "2023-PHY-019",  20, 0],
  ["To Kill a Mockingbird",       "2023-ENG-005",  22, 0],
  ["Fundamentals of Physics",     "2023-PHY-019",  45, 0],
  ["The C Programming Language",  "2023-CS-001",   28, 3],
  ["Computer Networks",           "2022-CS-052",   33, 0],
  ["University Physics",          "2022-PHY-026",  50, 0],
  ["Discrete Mathematics and Its Applications", "2022-MATH-021", 26, 1],
  ["Pride and Prejudice",         "2023-ENG-012",  19, 0],
  ["Financial Accounting",        "2021-COM-063",  38, 6],
  ["Tafsir Ibn Kathir (Abridged)", "2020-LAW-009", 44, 0],
];

const activeRows = active.map(([title, roll, dueInDays, renew]) => {
  const due = now + dueInDays * DAY;
  return {
    book_id: bookId[title], student_id: studId[roll],
    issued_at: iso(due - LOAN_DAYS * DAY), due_at: iso(due), renew_count: renew,
  };
});

const returnedRows = returned.map(([title, roll, issuedAgo, lateDays]) => {
  const issued = now - issuedAgo * DAY;
  const due = issued + LOAN_DAYS * DAY;
  return {
    book_id: bookId[title], student_id: studId[roll],
    issued_at: iso(issued), due_at: iso(due),
    // a late return lands after the due date; an on-time one, three days before
    returned_at: iso(lateDays > 0 ? due + lateDays * DAY : due - 3 * DAY),
  };
});

const insertedActive = await insert("loans", activeRows);
const insertedReturned = await insert("loans", returnedRows);
console.log(`Inserted ${activeRows.length + returnedRows.length} loans (${activeRows.length} on loan, ${returnedRows.length} returned).`);

// ---------- fines ----------
// Late fees are tied to the loan that caused them and priced at the library's
// own rate, so each one shows its full working in the app.
const lateFines = returned
  .map(([title, roll, , lateDays], i) => ({ title, roll, lateDays, loan: insertedReturned[i] }))
  .filter((x) => x.lateDays > 0)
  .map(({ title, roll, lateDays, loan }, i) => ({
    student_id: studId[roll],
    loan_id: loan.id,
    book_id: bookId[title],
    amount: lateDays * RATE,
    reason: "late",
    // a couple stay unpaid so the Fines page opens with something to do
    status: i % 3 === 0 ? "unpaid" : "paid",
    note: `${lateDays} day(s) late`,
  }));

// charges raised by hand, for books that never came back in one piece
const manualFines = [
  { roll: "2020-CS-088", title: "Operating System Concepts", amount: 1500, reason: "lost",    status: "unpaid", note: "Not returned after two reminders" },
  { roll: "2023-ENG-005", title: "To Kill a Mockingbird",    amount: 200,  reason: "damaged", status: "waived", note: "Torn pages — waived, first offence" },
  { roll: "2021-COM-063", title: "Cost Accounting",          amount: 900,  reason: "lost",    status: "unpaid", note: "Reported lost by the student" },
  { roll: "2022-MATH-021", title: "Elementary Differential Equations", amount: 350, reason: "damaged", status: "paid", note: "Water damage to the spine" },
].map(({ roll, title, ...f }) => ({
  ...f,
  student_id: studId[roll],
  book_id: bookId[title],
  // no loan behind a hand-raised charge, but PostgREST needs every row in a
  // batch to carry the same keys
  loan_id: null,
}));

await insert("fines", [...lateFines, ...manualFines]);
console.log(`Inserted ${lateFines.length + manualFines.length} fines (${lateFines.length} automatic late fees, ${manualFines.length} raised by hand).`);

// ---------- write-offs ----------
// Through the real function, so the inventory and the charge stay consistent.
const writeOffs = [
  // a copy that was out with a student and is not coming back
  { book: "Bang-e-Dra", loanRoll: "2023-URD-003", reason: "lost", note: "Left at home over the summer break", charge: 750 },
  // and one damaged on the shelf, with nobody to charge
  { book: "Chemical Principles", loanRoll: null, reason: "damaged", note: "Spine broken beyond repair", charge: 0 },
];
for (const w of writeOffs) {
  const loan = w.loanRoll
    ? insertedActive.find((l) => l.book_id === bookId[w.book] && l.student_id === studId[w.loanRoll])
    : null;
  const r = await rest("rpc/write_off_copy", { method: "POST", body: JSON.stringify({
    p_book_id: bookId[w.book], p_loan_id: loan?.id ?? null,
    p_reason: w.reason, p_note: w.note, p_charge: w.charge,
  }) });
  if (!r.ok) console.error(`  write-off failed for ${w.book}: ${await r.text()}`);
}
console.log(`Recorded ${writeOffs.length} write-offs.`);

// ---------- reservations ----------
// [book, roll, status, placed how many days ago, ready how many hours ago]
const reservations = [
  // a queue on a book whose copies are all out
  ["Linear Algebra Done Right",  "2022-CS-033",   "waiting",   3, null],
  ["Linear Algebra Done Right",  "2023-MATH-015", "waiting",   2, null],
  ["Linear Algebra Done Right",  "2023-CS-001",   "waiting",   1, null],
  ["Introduction to Algorithms", "2022-CS-052",   "waiting",   4, null],
  // and two waiting to be collected
  ["The Wealth of Nations",      "2023-PHY-019",  "ready",     2, 6],
  ["Deewan-e-Ghalib",            "2023-URD-003",  "ready",     1, 0.5],
  // plus some history
  ["Clean Code",                 "2021-CS-045",   "fulfilled", 26, null],
  ["1984",                       "2023-ENG-005",  "cancelled", 15, null],
].map(([title, roll, status, placedAgo, readyAgoHrs]) => ({
  book_id: bookId[title],
  student_id: studId[roll],
  status,
  created_at: iso(now - placedAgo * DAY),
  ready_at: readyAgoHrs === null ? null : iso(now - readyAgoHrs * 3600 * 1000),
}));
await insert("reservations", reservations);
console.log(`Inserted ${reservations.length} reservations.`);

console.log("\n✅ Demo data seeded.");
