// Runs every .sql file in supabase/migrations (in order) against the database.
// Needs DATABASE_URL in .env.local (Supabase → Settings → Database → Connection string → URI).
// Run:  node --env-file=.env.local scripts/migrate.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ DATABASE_URL not set in .env.local");
  process.exit(1);
}

const dir = "supabase/migrations";
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

// simple migration ledger so re-runs are safe
await client.query(`
  create table if not exists public._migrations (
    name text primary key,
    run_at timestamptz not null default now()
  )`);

for (const file of files) {
  const done = await client.query("select 1 from public._migrations where name = $1", [file]);
  if (done.rowCount) {
    console.log(`· skip ${file} (already applied)`);
    continue;
  }
  const sql = readFileSync(join(dir, file), "utf8");
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("insert into public._migrations (name) values ($1)", [file]);
    await client.query("commit");
    console.log(`✓ applied ${file}`);
  } catch (e) {
    await client.query("rollback");
    console.error(`❌ failed ${file}:`, e.message);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log("✅ migrations up to date");
