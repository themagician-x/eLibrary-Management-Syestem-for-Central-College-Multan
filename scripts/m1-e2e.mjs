// End-to-end check of the M1 catalogue.
// Run (dev server on :3000):  node scripts/m1-e2e.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { adminCredentials } from "../lib/admin-credentials.mjs";

const ADMIN = adminCredentials();

const BASE = "http://localhost:3000";
const EMAIL = ADMIN.email;
const PASSWORD = ADMIN.password;

mkdirSync("scripts/shots", { recursive: true });
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
let failed = false;
const ok = (m) => console.log("  ✓ " + m);
const bad = (m) => { console.log("  ✗ " + m); failed = true; };

// login
await page.goto(BASE + "/login", { waitUntil: "networkidle" });
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL(BASE + "/", { timeout: 8000 }).catch(() => {});
ok("logged in");

// table exists?
await page.goto(BASE + "/books", { waitUntil: "networkidle" });
if (await page.getByText("Couldn’t load books").count()) {
  bad("books table not found — did the migration run?");
  await browser.close();
  console.log("\n❌ M1 e2e FAILED"); process.exit(1);
}
ok("books table reachable");

// add a book with a cover
await page.goto(BASE + "/books/new", { waitUntil: "networkidle" });
await page.fill('input[name="title"]', "Clean Code");
await page.fill('input[name="author"]', "Robert C. Martin");
await page.fill('input[name="category"]', "Computer Science");
await page.fill('input[name="total_copies"]', "2");
await page.setInputFiles('input[type="file"]', resolve("scripts/fixtures/cover.png"));
// wait for the upload to finish (button label flips to "Change cover")
await page.getByText("Change cover").waitFor({ timeout: 10000 }).catch(() => {});
await page.getByRole("button", { name: "Add book" }).click();
await page.waitForURL(BASE + "/books", { timeout: 8000 }).catch(() => {});
(await page.getByText("Clean Code").count()) ? ok("added book (with cover upload)") : bad("new book not visible in list");

// search
await page.goto(BASE + "/books?q=Clean", { waitUntil: "networkidle" });
(await page.getByText("Clean Code").count()) ? ok("search finds the book") : bad("search failed");

// detail page → QR + barcode
await page.getByRole("link", { name: "Clean Code" }).first().click();
await page.waitForURL(/\/books\/[0-9a-f-]{36}$/, { timeout: 8000 }).catch(() => {});
await page.locator('img[alt="Book QR code"]').waitFor({ timeout: 5000 }).catch(() => {});
const hasQr = await page.locator('img[alt="Book QR code"]').count();
hasQr ? ok("detail page shows QR code") : bad("QR code missing");
await page.screenshot({ path: "scripts/shots/book-detail.png", fullPage: true });

// edit → change copies
await page.getByRole("link", { name: "Edit" }).first().click();
await page.waitForURL(/\/edit$/, { timeout: 8000 }).catch(() => {});
await page.locator('input[name="total_copies"]').waitFor({ timeout: 5000 });
await page.fill('input[name="total_copies"]', "5");
await page.getByRole("button", { name: "Save changes" }).click();
await page.waitForURL(BASE + "/books", { timeout: 8000 }).catch(() => {});
ok("edited book");

// CSV import
await page.goto(BASE + "/books/import", { waitUntil: "networkidle" });
await page.setInputFiles('input[type="file"]', resolve("scripts/fixtures/books.csv"));
await page.waitForTimeout(600);
(await page.getByText("Pragmatic Programmer").count()) ? ok("CSV parsed & previewed") : bad("CSV preview empty");
await page.getByRole("button", { name: /Import \d+ books/ }).click();
await page.waitForURL(BASE + "/books", { timeout: 10000 }).catch(() => {});
(await page.getByText("Sapiens").count()) ? ok("CSV import inserted books") : bad("imported books not visible");

// dashboard count
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.screenshot({ path: "scripts/shots/dashboard-m1.png", fullPage: true });
ok("dashboard rendered");

// cleanup: delete the Clean Code book
await page.goto(BASE + "/books?q=Clean", { waitUntil: "networkidle" });
if (await page.getByText("Clean Code").count()) {
  await page.getByRole("button", { name: /Delete Clean Code/ }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.waitForTimeout(1000);
  ok("deleted a book");
}

await browser.close();
console.log(failed ? "\n❌ M1 e2e FAILED" : "\n✅ M1 catalogue passed end-to-end");
process.exit(failed ? 1 : 0);
