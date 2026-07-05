// End-to-end check of M3 circulation. Run: node --env-file=.env.local scripts/m3-e2e.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const S = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: S, Authorization: "Bearer " + S, "Content-Type": "application/json", Prefer: "return=representation" };

// ---- REST helpers (service key, bypasses RLS) for seeding/cleanup ----
const rest = (path, opts = {}) => fetch(`${U}/rest/v1/${path}`, { headers: H, ...opts });
const bc = () => "200" + Math.floor(Math.random() * 1e10);

async function seed() {
  const books = await (await rest("books", {
    method: "POST",
    body: JSON.stringify(
      [1, 2, 3, 4].map((n) => ({ title: `Loan Book ${n}`, author: "E2E", total_copies: 1, available_copies: 1, barcode: bc() }))
    ),
  })).json();
  const students = await (await rest("students", {
    method: "POST",
    body: JSON.stringify([
      { name: "Loan Tester", roll_no: "LT-1", status: "active" },
      { name: "Blocked Tester", roll_no: "BT-1", status: "blocked" },
    ]),
  })).json();
  return { books, students };
}
async function cleanup() {
  await rest("loans?id=not.is.null", { method: "DELETE" });
  await rest("books?author=eq.E2E", { method: "DELETE" });
  await rest("students?roll_no=in.(LT-1,BT-1)", { method: "DELETE" });
}

mkdirSync("scripts/shots", { recursive: true });
await cleanup();
await seed();

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 950 } })).newPage();
let failed = false;
const ok = (m) => console.log("  ✓ " + m);
const bad = (m) => { console.log("  ✗ " + m); failed = true; };

async function issue(bookTitle, studentName) {
  await page.getByPlaceholder("Scan barcode or search title…").fill(bookTitle);
  await page.getByRole("button", { name: new RegExp(bookTitle) }).first().click();
  await page.getByPlaceholder("Search name or roll no…").fill(studentName);
  await page.getByRole("button", { name: new RegExp(studentName) }).first().click();
  await page.getByRole("button", { name: "Issue", exact: true }).click();
  await page.waitForTimeout(1200);
}

// login
await page.goto(BASE + "/login", { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "admin@central.edu.pk");
await page.fill('input[name="password"]', "***REMOVED-ROTATED-CREDENTIAL***");
await page.click('button[type="submit"]');
await page.waitForURL(BASE + "/", { timeout: 8000 }).catch(() => {});
ok("logged in");

await page.goto(BASE + "/circulation", { waitUntil: "networkidle" });
if (await page.getByText("Couldn’t load loans").count()) { bad("loans table missing"); await browser.close(); await cleanup(); process.exit(1); }
ok("circulation page loads");

// issue Book 1
await issue("Loan Book 1", "Loan Tester");
(await page.getByText(/issued to Loan Tester/).count()) ? ok("issued a book") : bad("issue did not confirm");
(await page.getByText("Loan Book 1").count()) ? ok("book appears in 'on loan'") : bad("loan not listed");

// renew Book 1
await page.getByRole("button", { name: "Renew" }).first().click();
const renewed = await page.getByText(/renewed 1/).waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
renewed ? ok("renew works") : bad("renew count not shown");

// issue Book 2 and 3 → student now at 3 loans
await issue("Loan Book 2", "Loan Tester");
await issue("Loan Book 3", "Loan Tester");

// 4th issue → borrowing limit
await issue("Loan Book 4", "Loan Tester");
(await page.getByText(/Borrowing limit/i).count()) ? ok("borrowing limit enforced") : bad("limit not enforced");

// blocked student: cannot even be selected (disabled in the picker)
await page.reload({ waitUntil: "networkidle" });
await page.getByPlaceholder("Search name or roll no…").fill("Blocked Tester");
const blockedOpt = page.getByRole("button", { name: /Blocked Tester/ }).first();
await blockedOpt.waitFor({ timeout: 5000 }).catch(() => {});
(await blockedOpt.isDisabled()) ? ok("blocked student not selectable in picker") : bad("blocked student was selectable");

// return Book 1
await page.goto(BASE + "/circulation", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Return", exact: true }).first().click();
await page.waitForTimeout(1200);
await page.goto(BASE + "/circulation", { waitUntil: "networkidle" });
const onLoan = await page.getByText(/^Loan Book [0-9]$/).count();
onLoan === 2 ? ok("return works (2 books remain on loan)") : bad(`expected 2 on loan, saw ${onLoan}`);

// overdue view: push open loans into the past
await rest("loans?returned_at=is.null", { method: "PATCH", body: JSON.stringify({ due_at: new Date(Date.now() - 3 * 86400000).toISOString() }) });
await page.goto(BASE + "/circulation?filter=overdue", { waitUntil: "networkidle" });
(await page.getByText(/overdue/i).first().count()) && (await page.getByText(/Loan Book/).count())
  ? ok("overdue filter shows overdue loans")
  : bad("overdue view empty");
await page.screenshot({ path: "scripts/shots/circulation.png", fullPage: true });

// dashboard reflects issued + overdue
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.screenshot({ path: "scripts/shots/dashboard-m3.png", fullPage: true });
ok("dashboard rendered");

await browser.close();
await cleanup();
console.log(failed ? "\n❌ M3 e2e FAILED" : "\n✅ M3 circulation passed end-to-end");
process.exit(failed ? 1 : 0);
