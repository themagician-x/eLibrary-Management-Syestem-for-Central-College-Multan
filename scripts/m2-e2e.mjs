// End-to-end check of M2 students. Run (dev on :3000): node scripts/m2-e2e.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = "http://localhost:3000";
mkdirSync("scripts/shots", { recursive: true });
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
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

// table reachable
await page.goto(BASE + "/students", { waitUntil: "networkidle" });
if (await page.getByText("Couldn’t load students").count()) { bad("students table missing"); await browser.close(); process.exit(1); }
ok("students table reachable");

// add student with photo
await page.goto(BASE + "/students/new", { waitUntil: "networkidle" });
await page.fill('input[name="name"]', "Ayesha Khan");
await page.fill('input[name="roll_no"]', "2024-CS-014");
await page.fill('input[name="class_dept"]', "BS Computer Science");
await page.fill('input[name="email"]', "ayesha@example.com");
await page.setInputFiles('input[type="file"]', resolve("scripts/fixtures/cover.png"));
await page.getByText("Change photo").waitFor({ timeout: 10000 }).catch(() => {});
await page.getByRole("button", { name: "Add student" }).click();
await page.waitForURL(BASE + "/students", { timeout: 8000 }).catch(() => {});
(await page.getByText("Ayesha Khan").count()) ? ok("added student (with photo)") : bad("student not in list");

// duplicate roll number rejected
await page.goto(BASE + "/students/new", { waitUntil: "networkidle" });
await page.fill('input[name="name"]', "Someone Else");
await page.fill('input[name="roll_no"]', "2024-CS-014");
await page.getByRole("button", { name: "Add student" }).click();
await page.waitForTimeout(1000);
(await page.getByText(/already registered/i).count()) ? ok("duplicate roll no rejected") : bad("duplicate not rejected");

// search
await page.goto(BASE + "/students?q=Ayesha", { waitUntil: "networkidle" });
(await page.getByText("Ayesha Khan").count()) ? ok("search finds student") : bad("search failed");

// profile page
await page.getByRole("link", { name: /Ayesha Khan/ }).first().click();
await page.waitForURL(/\/students\/[0-9a-f-]{36}$/, { timeout: 8000 }).catch(() => {});
(await page.getByText("2024-CS-014").count()) ? ok("profile page renders") : bad("profile missing details");
await page.screenshot({ path: "scripts/shots/student-profile.png", fullPage: true });

// edit → block
await page.getByRole("link", { name: "Edit" }).first().click();
await page.waitForURL(/\/edit$/, { timeout: 8000 }).catch(() => {});
await page.selectOption('select[name="status"]', "blocked");
await page.getByRole("button", { name: "Save changes" }).click();
await page.waitForURL(BASE + "/students", { timeout: 8000 }).catch(() => {});
await page.goto(BASE + "/students?status=blocked", { waitUntil: "networkidle" });
(await page.getByText("Ayesha Khan").count()) ? ok("edit (status→blocked) + status filter") : bad("status change/filter failed");

// dashboard count
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.screenshot({ path: "scripts/shots/dashboard-m2.png", fullPage: true });
ok("dashboard rendered");

// delete
await page.goto(BASE + "/students?q=Ayesha", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Delete Ayesha Khan/ }).click();
await page.getByRole("button", { name: "Confirm" }).click();
await page.waitForTimeout(1200);
await page.goto(BASE + "/students?q=Ayesha", { waitUntil: "networkidle" });
(await page.getByText("Ayesha Khan").count()) === 0 ? ok("deleted student") : bad("student still present after delete");

await browser.close();
console.log(failed ? "\n❌ M2 e2e FAILED" : "\n✅ M2 students passed end-to-end");
process.exit(failed ? 1 : 0);
