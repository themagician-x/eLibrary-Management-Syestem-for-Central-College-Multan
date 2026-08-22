// Removes the student-photos bucket and every file in it.
// Supabase forbids deleting from the storage tables in SQL, so this runs
// through the Storage API. Companion to migration 0011.
//
// Run:  node --env-file=.env.local scripts/drop-student-photos.mjs
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const BUCKET = "student-photos";

const buckets = await (await fetch(`${URL}/storage/v1/bucket`, { headers: H })).json();
if (!Array.isArray(buckets) || !buckets.some((b) => b.id === BUCKET)) {
  console.log(`✓ ${BUCKET} bucket is already gone — nothing to do.`);
  process.exit(0);
}

// list everything, then delete in one call
const list = await (
  await fetch(`${URL}/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ prefix: "", limit: 1000, offset: 0 }),
  })
).json();

const names = (Array.isArray(list) ? list : []).map((o) => o.name).filter(Boolean);
if (names.length) {
  const del = await fetch(`${URL}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: H,
    body: JSON.stringify({ prefixes: names }),
  });
  console.log(del.ok ? `✓ deleted ${names.length} photo(s)` : `❌ delete failed: ${await del.text()}`);
} else {
  console.log("· bucket was empty");
}

const empty = await fetch(`${URL}/storage/v1/bucket/${BUCKET}/empty`, { method: "POST", headers: H });
if (!empty.ok) console.log(`· empty returned ${empty.status} (continuing)`);

const drop = await fetch(`${URL}/storage/v1/bucket/${BUCKET}`, { method: "DELETE", headers: H });
console.log(drop.ok ? `✅ ${BUCKET} bucket removed` : `❌ could not remove bucket: ${await drop.text()}`);
process.exit(drop.ok ? 0 : 1);
