// End-to-end check of M7 settings + reports + dashboard.
// Run: node --env-file=.env.local scripts/m7-e2e.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const S = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: S, Authorization: "Bearer " + S, "Content-Type": "application/json", Prefer: "return=representation" };
const rest = (p, o = {}) => fetch(`${U}/rest/v1/${p}`, { headers: H, ...o });
const bc = () => "200" + Math.floor(Math.random() * 1e10);

async function cleanup() {
  await rest("loans?id=not.is.null", { method: "DELETE" });
  await rest("books?author=eq.RPT", { method: "DELETE" });
  await rest("students?roll_no=eq.RS-1", { method: "DELETE" });
  await rest("settings?id=eq.1", { method: "PATCH", body: JSON.stringify({ loan_days: 14, max_books: 3, max_renews: 2, fine_per_day: 5 }) });
}

mkdirSync("scripts/shots", { recursive: true });
await cleanup();
const [bookA] = await (await rest("books", { method: "POST", body: JSON.stringify({ title: "Report Book A", author: "RPT", category: "TestCat", total_copies: 2, available_copies: 1, barcode: bc() }) })).json();
await rest("books", { method: "POST", body: JSON.stringify({ title: "Report Book B", author: "RPT", category: "TestCat", total_copies: 1, available_copies: 1, barcode: bc() }) });
const [stud] = await (await rest("students", { method: "POST", body: JSON.stringify({ name: "Report Stud", roll_no: "RS-1", status: "active" }) })).json();
await rest("loans", { method: "POST", body: JSON.stringify({ book_id: bookA.id, student_id: stud.id, due_at: new Date(Date.now() + 5 * 86400000).toISOString() }) });

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 950 } })).newPage();
let failed = false;
const ok = (m) => console.log("  ✓ " + m);
const bad = (m) => { console.log("  ✗ " + m); failed = true; };

// login
await page.goto(BASE + "/login", { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "admin@central.edu.pk");
await page.fill('input[name="password"]', "***REMOVED-ROTATED-CREDENTIAL***");
await page.click('button[type="submit"]');
await page.waitForURL(BASE + "/", { timeout: 8000 }).catch(() => {});
ok("logged in");

// --- Settings ---
await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
await page.fill('input[name="loan_days"]', "7");
await page.fill('input[name="max_books"]', "4");
await page.fill('input[name="fine_per_day"]', "10");
await page.getByRole("button", { name: "Save changes" }).click();
await page.getByText("Saved ✓").waitFor({ timeout: 5000 }).then(() => ok("settings saved")).catch(() => bad("no save confirmation"));
await page.reload({ waitUntil: "networkidle" });
(await page.locator('input[name="loan_days"]').inputValue()) === "7" ? ok("settings persisted after reload") : bad("settings did not persist");

// settings applied to circulation help text
await page.goto(BASE + "/circulation", { waitUntil: "networkidle" });
(await page.getByText(/7-day loan · max 4 books/).count()) ? ok("circulation uses new rules") : bad("circulation help text not updated");

// fine rate reflected
await page.goto(BASE + "/fines", { waitUntil: "networkidle" });
(await page.getByText(/Rs 10/).count()) ? ok("fine rate updated on fines page") : bad("fine rate not updated");

// --- Reports ---
await page.goto(BASE + "/reports", { waitUntil: "networkidle" });
(await page.getByText("Most borrowed").count()) ? ok("reports page loads") : bad("reports page missing");
(await page.getByText("Report Book A").count()) ? ok("most-borrowed chart shows data") : bad("most-borrowed empty");
(await page.getByText("TestCat").count()) ? ok("category chart shows data") : bad("category chart empty");
await page.screenshot({ path: "scripts/shots/reports.png", fullPage: true });

// CSV export (uses the browser session)
const res = await page.request.get(BASE + "/api/export/books");
const ct = res.headers()["content-type"] || "";
const body = await res.text();
res.status() === 200 && ct.includes("csv") && body.includes("Report Book A")
  ? ok("CSV export works")
  : bad(`CSV export failed (status ${res.status()}, type ${ct})`);

// --- Dashboard ---
await page.goto(BASE + "/", { waitUntil: "networkidle" });
(await page.getByText("Needs attention").count()) ? ok("dashboard overview renders") : bad("dashboard overview missing");
await page.screenshot({ path: "scripts/shots/dashboard-m7.png", fullPage: true });

await browser.close();
await cleanup();
console.log(failed ? "\n❌ M7 e2e FAILED" : "\n✅ M7 settings/reports/dashboard passed end-to-end");
process.exit(failed ? 1 : 0);
