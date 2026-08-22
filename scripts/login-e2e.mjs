// End-to-end check of the M0 auth flow.
// Run (dev server on :3000):  node scripts/login-e2e.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { adminCredentials } from "../lib/admin-credentials.mjs";

const BASE = "http://localhost:3000";
const ADMIN = adminCredentials();
const EMAIL = process.argv[2] || ADMIN.email;
const PASSWORD = process.argv[3] || ADMIN.password;

mkdirSync("scripts/shots", { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
let failed = false;
const ok = (m) => console.log("  ✓ " + m);
const bad = (m) => { console.log("  ✗ " + m); failed = true; };

// 1) hitting a protected route while logged out lands on /login
await page.goto(BASE + "/", { waitUntil: "networkidle" });
page.url().endsWith("/login") ? ok("logged-out / → redirected to /login") : bad(`expected /login, got ${page.url()}`);

// 2) wrong password shows an error and stays on /login
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="password"]', "wrong-password");
await page.click('button[type="submit"]');
await page.waitForTimeout(1200);
(await page.locator('[role="alert"]').count()) ? ok("wrong password → error shown") : bad("no error for wrong password");

// 3) correct credentials → dashboard (fresh page, fill both fields)
await page.goto(BASE + "/login", { waitUntil: "networkidle" });
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL(BASE + "/", { timeout: 8000 }).catch(() => {});
if (page.url() !== BASE + "/") {
  const alert = await page.locator('[role="alert"]').first().textContent().catch(() => null);
  bad(`still at ${page.url()}${alert ? ` — alert: "${alert.trim()}"` : ""}`);
} else {
  ok("valid login → redirected to dashboard");
}
(await page.getByText("You’re connected").count()) || (await page.getByRole("heading", { name: "Dashboard" }).count())
  ? ok("dashboard content rendered")
  : bad("dashboard content not found");
await page.screenshot({ path: "scripts/shots/dashboard.png", fullPage: true });

// 4) navigate a stub section
await page.goto(BASE + "/books", { waitUntil: "networkidle" });
(await page.getByText("Arrives in M1").count()) ? ok("Books section renders (M1 placeholder)") : bad("Books placeholder missing");

// 5) sign out → back to /login, and protected route stays guarded
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Sign out" }).click();
await page.waitForURL("**/login", { timeout: 8000 }).catch(() => {});
page.url().endsWith("/login") ? ok("sign out → /login") : bad(`sign out landed on ${page.url()}`);

await browser.close();
console.log(failed ? "\n❌ M0 e2e FAILED" : "\n✅ M0 auth flow passed end-to-end");
process.exit(failed ? 1 : 0);
