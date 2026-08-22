import { chromium } from "playwright";
import { adminCredentials } from "../lib/admin-credentials.mjs";
const A = adminCredentials();
const W = 360;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: W, height: 780 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const D = process.argv[2];
const bad = [];
const check = async (name) => {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`  ${o > 1 ? "✗" : "✓"} ${name}${o > 1 ? ` — overflows by ${o}px` : ""}`);
  if (o > 1) bad.push(name);
};

// ---- college website: mobile menu open ----
await page.goto("http://localhost:3001/", { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.getByRole("button", { name: /menu/i }).first().click().catch(() => {});
await page.waitForTimeout(600);
await check("website · mobile menu open");
await page.screenshot({ path: `${D}/m-website-menu.png` });

// ---- elibrary ----
await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await check("elibrary · login");
await page.screenshot({ path: `${D}/m-login.png` });
await page.fill('input[name="email"]', A.email);
await page.fill('input[name="password"]', A.password);
await page.click('button[type="submit"]');
await page.waitForURL("http://localhost:3000/", { timeout: 20000 });
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1200);
await check("elibrary · dashboard");
await page.screenshot({ path: `${D}/m-dash.png`, fullPage: false });

// sidebar drawer
await page.getByRole("button", { name: "Open menu" }).click();
await page.waitForTimeout(600);
await check("elibrary · sidebar drawer");
await page.screenshot({ path: `${D}/m-sidebar.png` });
await page.keyboard.press("Escape");
await page.mouse.click(340, 400);
await page.waitForTimeout(400);

// student drawer
await page.goto("http://localhost:3000/students", { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.locator("button").filter({ hasText: /2023-CS-001|Ahmed/ }).first().click().catch(() => {});
await page.waitForTimeout(1200);
await check("elibrary · student drawer");
await page.screenshot({ path: `${D}/m-drawer.png` });
await page.keyboard.press("Escape");
await page.waitForTimeout(500);

// a form modal
await page.goto("http://localhost:3000/books/new", { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await check("elibrary · add-book form");
await page.screenshot({ path: `${D}/m-form.png` });

// tables
await page.goto("http://localhost:3000/circulation", { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await check("elibrary · circulation table");
await page.screenshot({ path: `${D}/m-table.png` });

console.log(bad.length ? `\n${bad.length} state(s) overflow` : "\nno overflow in any state ✓");
await b.close();
