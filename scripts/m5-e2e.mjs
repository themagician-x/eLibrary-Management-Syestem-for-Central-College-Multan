// End-to-end check of M5 reservations. Run: node --env-file=.env.local scripts/m5-e2e.mjs
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
  await rest("reservations?id=not.is.null", { method: "DELETE" });
  await rest("fines?id=not.is.null", { method: "DELETE" });
  await rest("loans?id=not.is.null", { method: "DELETE" });
  await rest("books?author=eq.HOLD", { method: "DELETE" });
  await rest("students?roll_no=in.(HA-1,HB-1,HC-1)", { method: "DELETE" });
}

mkdirSync("scripts/shots", { recursive: true });
await cleanup();

const [book] = await (await rest("books", { method: "POST", body: JSON.stringify({ title: "Hold Book", author: "HOLD", total_copies: 1, barcode: bc() }) })).json();
const studs = await (await rest("students", { method: "POST", body: JSON.stringify([
  { name: "Holder A", roll_no: "HA-1", status: "active" },
  { name: "Holder B", roll_no: "HB-1", status: "active" },
  { name: "Holder C", roll_no: "HC-1", status: "active" },
]) })).json();
const A = studs.find((s) => s.roll_no === "HA-1");
await rest("loans", { method: "POST", body: JSON.stringify({ book_id: book.id, student_id: A.id, due_at: new Date(Date.now() + 5 * 86400000).toISOString() }) });

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 950 } })).newPage();
let failed = false;
const ok = (m) => console.log("  ✓ " + m);
const bad = (m) => { console.log("  ✗ " + m); failed = true; };

async function reserve(bookTitle, studentName) {
  await page.getByPlaceholder("Search title or scan barcode…").fill(bookTitle);
  await page.getByRole("button", { name: new RegExp(bookTitle) }).first().click();
  await page.getByPlaceholder("Search name or roll no…").fill(studentName);
  await page.getByRole("button", { name: new RegExp(studentName) }).first().click();
  await page.getByRole("button", { name: "Reserve", exact: true }).click();
  await page.waitForTimeout(1100);
}

// login
await page.goto(BASE + "/login", { waitUntil: "networkidle" });
await page.fill('input[name="email"]', ADMIN.email);
await page.fill('input[name="password"]', ADMIN.password);
await page.click('button[type="submit"]');
await page.waitForURL(BASE + "/", { timeout: 8000 }).catch(() => {});
ok("logged in");

await page.goto(BASE + "/reservations", { waitUntil: "networkidle" });
if (await page.getByText("Couldn’t load reservations").count()) { bad("reservations table missing"); await browser.close(); await cleanup(); process.exit(1); }
ok("reservations page loads");

// queue: B then C
await reserve("Hold Book", "Holder B");
(await page.getByText(/#1 in queue/).count()) ? ok("first hold → #1 in queue") : bad("queue position 1 missing");
await reserve("Hold Book", "Holder C");
(await page.getByText(/#2 in queue/).count()) ? ok("second hold → #2 in queue") : bad("queue position 2 missing");

// duplicate reservation rejected
await reserve("Hold Book", "Holder B");
(await page.getByText(/already reserved/i).count()) ? ok("duplicate reservation rejected") : bad("duplicate not rejected");

// return A's loan → B promoted to ready
await page.goto(BASE + "/circulation", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Return", exact: true }).first().click();
await page.waitForTimeout(2200);
await page.goto(BASE + "/reservations", { waitUntil: "networkidle" });
(await page.getByText("Ready for pickup", { exact: true }).count()) ? ok("return promoted next in queue to 'ready'") : bad("no ready reservation after return");
await page.screenshot({ path: "scripts/shots/reservations.png", fullPage: true });

// issue to the ready student (B) → fulfils reservation
await page.getByRole("button", { name: "Issue", exact: true }).first().click();
await page.waitForTimeout(1800);
await page.goto(BASE + "/reservations", { waitUntil: "networkidle" });
(await page.getByText("Ready for pickup", { exact: true }).count()) === 0 ? ok("issued to ready student (hold fulfilled)") : bad("ready hold not cleared after issue");

// B appears in history as fulfilled
await page.goto(BASE + "/reservations?filter=history", { waitUntil: "networkidle" });
(await page.getByText(/fulfilled/i).count()) ? ok("fulfilled hold shown in history") : bad("fulfilled not in history");

// cancel C's remaining hold
await page.goto(BASE + "/reservations", { waitUntil: "networkidle" });
(await page.getByText("Holder C").count()) ? ok("C still active after B fulfilled") : bad("C missing");
await page.getByRole("button", { name: "Cancel", exact: true }).first().click();
await page.waitForTimeout(1200);
(await page.getByText("Holder C").count()) === 0 ? ok("cancelled a reservation") : bad("cancel failed");

await browser.close();
await cleanup();
console.log(failed ? "\n❌ M5 e2e FAILED" : "\n✅ M5 reservations passed end-to-end");
process.exit(failed ? 1 : 0);
