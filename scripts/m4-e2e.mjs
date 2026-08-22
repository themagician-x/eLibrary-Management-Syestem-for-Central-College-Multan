// End-to-end check of M4 fines. Run: node --env-file=.env.local scripts/m4-e2e.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { adminCredentials } from "../lib/admin-credentials.mjs";
import { assertTestProject } from "../lib/test-guard.mjs";

assertTestProject();

const ADMIN = adminCredentials();

const BASE = "http://localhost:3000";
const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const S = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: S, Authorization: "Bearer " + S, "Content-Type": "application/json", Prefer: "return=representation" };
const rest = (p, o = {}) => fetch(`${U}/rest/v1/${p}`, { headers: H, ...o });
const bc = () => "200" + Math.floor(Math.random() * 1e10);

async function cleanup() {
  await rest("fines?id=not.is.null", { method: "DELETE" });
  await rest("loans?id=not.is.null", { method: "DELETE" });
  await rest("books?author=eq.FINE", { method: "DELETE" });
  await rest("students?roll_no=eq.FT-1", { method: "DELETE" });
}

mkdirSync("scripts/shots", { recursive: true });
await cleanup();

// seed: a book (1 copy, currently out), a student, and an overdue open loan
const [book] = await (await rest("books", { method: "POST", body: JSON.stringify({ title: "Fine Book", author: "FINE", total_copies: 1, barcode: bc() }) })).json();
const [stud] = await (await rest("students", { method: "POST", body: JSON.stringify({ name: "Fine Tester", roll_no: "FT-1", status: "active" }) })).json();
await rest("loans", { method: "POST", body: JSON.stringify({
  book_id: book.id, student_id: stud.id,
  issued_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  due_at: new Date(Date.now() - 4 * 86400000).toISOString(),
}) });

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 950 } })).newPage();
let failed = false;
const ok = (m) => console.log("  ✓ " + m);
const bad = (m) => { console.log("  ✗ " + m); failed = true; };

// login
await page.goto(BASE + "/login", { waitUntil: "networkidle" });
await page.fill('input[name="email"]', ADMIN.email);
await page.fill('input[name="password"]', ADMIN.password);
await page.click('button[type="submit"]');
await page.waitForURL(BASE + "/", { timeout: 8000 }).catch(() => {});
ok("logged in");

// return the overdue loan → auto late fee
await page.goto(BASE + "/circulation", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Return", exact: true }).first().click();
await page.waitForTimeout(2500);
ok("returned the overdue loan");

// the auto late fee should now exist on /fines
await page.goto(BASE + "/fines?status=unpaid", { waitUntil: "networkidle" });
(await page.getByText("Fine Tester").count()) ? ok("auto late fine created & listed under unpaid") : bad("late fine missing");
(await page.getByText(/^late$/i).count()) ? ok("reason shown as 'late'") : bad("late reason missing");

// add a manual lost-book charge
await page.getByRole("button", { name: "+ Add charge" }).click();
await page.getByPlaceholder("Search name or roll no…").fill("Fine Tester");
await page.getByRole("button", { name: /Fine Tester/ }).first().click();
await page.fill('input[type="number"]', "500");
await page.getByRole("button", { name: "Add charge", exact: true }).click();
await page.waitForTimeout(1200);
(await page.getByText("Rs 500").count()) ? ok("manual lost charge added") : bad("manual charge missing");

// outstanding summary reflects both fines
const outstandingText = await page.locator("text=Outstanding").locator("xpath=..").innerText();
/5\d\d/.test(outstandingText) ? ok("outstanding total includes charges") : bad(`outstanding looks wrong: ${outstandingText}`);

// mark the newest (lost, Rs 500) fine as paid
await page.getByRole("button", { name: "Mark paid" }).first().click();
await page.waitForTimeout(1000);
await page.goto(BASE + "/fines?status=paid", { waitUntil: "networkidle" });
(await page.getByText("Rs 500").count()) ? ok("fine marked paid (shows under Paid)") : bad("paid fine not under Paid");

// waive the remaining late fine
await page.goto(BASE + "/fines?status=unpaid", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Waive" }).first().click();
await page.waitForTimeout(1000);
await page.goto(BASE + "/fines?status=waived", { waitUntil: "networkidle" });
(await page.getByText("Fine Tester").count()) ? ok("fine waived (shows under Waived)") : bad("waived fine missing");
await page.screenshot({ path: "scripts/shots/fines.png", fullPage: true });

// student profile shows outstanding fines figure
await page.goto(BASE + `/students/${stud.id}`, { waitUntil: "networkidle" });
(await page.getByText("Outstanding fines").count()) ? ok("student profile shows outstanding fines") : bad("profile fines missing");

await browser.close();
await cleanup();
console.log(failed ? "\n❌ M4 e2e FAILED" : "\n✅ M4 fines passed end-to-end");
process.exit(failed ? 1 : 0);
