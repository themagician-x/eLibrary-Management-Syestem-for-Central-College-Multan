import { chromium } from "playwright";
import { adminCredentials } from "../lib/admin-credentials.mjs";
const A = adminCredentials();
const DEVICE_W = 320;
const PATHS = ["/", "/books", "/students", "/circulation", "/reservations", "/fines",
  "/reports", "/guide", "/settings", "/books/new", "/students/new", "/circulation/issue",
  "/fines/new", "/reservations/new", "/books/import"];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: DEVICE_W, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.fill('input[name="email"]', A.email);
await page.fill('input[name="password"]', A.password);
await page.click('button[type="submit"]');
await page.waitForURL("http://localhost:3000/", { timeout: 25000 });

for (const path of PATHS) {
  await page.goto("http://localhost:3000" + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(450);
  const r = await page.evaluate((DW) => {
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const bb = el.getBoundingClientRect();
      if (bb.width === 0 || bb.height === 0) continue;
      if (bb.width <= DW + 1) continue;            // wider than the DEVICE, not the stretched viewport
      let p = el.parentElement, sc = false;
      while (p) { const c = getComputedStyle(p); if (["auto","scroll"].includes(c.overflowX)) { sc = true; break; } p = p.parentElement; }
      if (sc) continue;
      out.push({ tag: el.tagName.toLowerCase(), cls: (el.className?.toString?.()||"").slice(0,90), w: Math.round(bb.width) });
    }
    // keep only the widest few, and drop pure ancestors of a wider child
    out.sort((a, z) => z.w - a.w);
    return { innerW: window.innerWidth, docW: document.documentElement.scrollWidth, worst: out.slice(0, 5) };
  }, DEVICE_W);
  if (r.worst.length || r.innerW > DEVICE_W) {
    console.log(`\n✗ ${path}   innerWidth=${r.innerW} (device ${DEVICE_W})  doc=${r.docW}`);
    r.worst.forEach((w) => console.log(`     ${w.w}px  <${w.tag}> ${w.cls}`));
  } else console.log(`✓ ${path}`);
}
await b.close();
