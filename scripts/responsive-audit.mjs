// Walks every page of either app at seven viewport widths and reports the two
// faults that break a layout on a phone: content wider than the viewport, and
// controls too small to hit.
//
//   node --env-file=.env.local scripts/responsive-audit.mjs elibrary
//   node --env-file=.env.local scripts/responsive-audit.mjs website
//
// The website target expects the college site on :3001.
//
// Inline links inside a sentence are reported but are not faults — WCAG 2.5.8
// exempts them, and padding them would break the line rhythm of the paragraph.
import { chromium } from "playwright";
import { adminCredentials } from "../lib/admin-credentials.mjs";

const WIDTHS = [320, 360, 414, 768, 1024, 1280, 1536];
const TARGETS = {
  elibrary: { base: "http://localhost:3000", login: true,
    paths: ["/", "/books", "/students", "/circulation", "/reservations", "/fines", "/reports", "/guide", "/settings", "/books/new", "/students/new", "/circulation/issue"] },
  website: { base: "http://localhost:3001", login: false,
    paths: ["/", "/programs", "/short-courses", "/faculty", "/campus", "/events", "/contact"] },
};

const which = process.argv[2];
const t = TARGETS[which];
const b = await chromium.launch();
const findings = [];

for (const width of WIDTHS) {
  const ctx = await b.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  if (t.login) {
    const A = adminCredentials();
    await page.goto(t.base + "/login", { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', A.email);
    await page.fill('input[name="password"]', A.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(t.base + "/", { timeout: 20000 }).catch(() => {});
  }
  for (const path of t.paths) {
    await page.goto(t.base + path, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(350);
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const overflow = document.documentElement.scrollWidth - vw;
      const culprits = [];
      if (overflow > 1) {
        for (const el of document.querySelectorAll("body *")) {
          const b = el.getBoundingClientRect();
          if (b.width === 0 || b.height === 0) return;
          if (b.right > vw + 1 || b.left < -1) {
            const cs = getComputedStyle(el);
            if (cs.position === "fixed" || cs.overflowX === "auto" || cs.overflowX === "scroll") continue;
            let p = el.parentElement, inScroller = false;
            while (p) { const pc = getComputedStyle(p);
              if (pc.overflowX === "auto" || pc.overflowX === "scroll" || pc.overflowX === "hidden") { inScroller = true; break; } p = p.parentElement; }
            if (inScroller) continue;
            culprits.push(`${el.tagName.toLowerCase()}.${(el.className?.toString?.() || "").split(" ").filter(Boolean).slice(0,3).join(".")} → right ${Math.round(b.right)} (vw ${vw})`);
          }
        }
      }
      // tap targets that are too small to hit on a phone
      const small = [];
      for (const el of document.querySelectorAll("a, button, [role=button]")) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) continue;
        if (b.height < 28 && (el.textContent || "").trim().length > 0)
          small.push(`${el.tagName.toLowerCase()} "${(el.textContent||"").trim().slice(0,24)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
      }
      return { overflow, culprits: [...new Set(culprits)].slice(0, 4), small: [...new Set(small)].slice(0, 3) };
    }).catch(() => null);
    if (!r) continue;
    if (r.overflow > 1) findings.push({ width, path, kind: "overflow", detail: `+${r.overflow}px`, culprits: r.culprits });
    if (width <= 414 && r.small.length) findings.push({ width, path, kind: "tap-target", culprits: r.small });
  }
  await ctx.close();
}
await b.close();

if (!findings.length) console.log(`${which}: no horizontal overflow or small tap targets at any width ✓`);
else {
  console.log(`${which}: ${findings.length} finding(s)\n`);
  for (const f of findings) {
    console.log(`  ${String(f.width).padStart(4)}px ${f.path.padEnd(22)} ${f.kind} ${f.detail ?? ""}`);
    f.culprits.forEach((c) => console.log(`        ${c}`));
  }
}
