// Creates (or resets) the single admin user, then verifies sign-in works.
// Uses the GoTrue REST API directly (no supabase-js → no WebSocket needed).
// Run:  node --env-file=.env.local scripts/create-admin.mjs [email] [password]

import { adminCredentials } from "../lib/admin-credentials.mjs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN = adminCredentials();
const email = process.argv[2] || ADMIN.email;
const password = process.argv[3] || ADMIN.password;

if (!URL || !ANON || !SECRET) {
  console.error("❌ Missing env vars. Did you fill in .env.local?");
  process.exit(1);
}

const adminHeaders = {
  apikey: SECRET,
  Authorization: `Bearer ${SECRET}`,
  "Content-Type": "application/json",
};

// 1) find existing user by email
const listRes = await fetch(
  `${URL}/auth/v1/admin/users?per_page=200`,
  { headers: adminHeaders }
);
if (!listRes.ok) {
  console.error("❌ Cannot reach Supabase admin API:", listRes.status, await listRes.text());
  process.exit(1);
}
const { users } = await listRes.json();
const existing = users?.find((u) => u.email === email);

// 2) create or update
if (existing) {
  const res = await fetch(`${URL}/auth/v1/admin/users/${existing.id}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({ password, email_confirm: true }),
  });
  if (!res.ok) {
    console.error("❌ Update failed:", await res.text());
    process.exit(1);
  }
  console.log(`↻ Updated existing admin: ${email}`);
} else {
  const res = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) {
    console.error("❌ Create failed:", await res.text());
    process.exit(1);
  }
  console.log(`✓ Created admin: ${email}`);
}

// 3) verify sign-in with the anon (browser) key
const signInRes = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const signIn = await signInRes.json();

if (!signInRes.ok || !signIn.access_token) {
  console.error("❌ Sign-in verification FAILED:", signIn.error_description || JSON.stringify(signIn));
  process.exit(1);
}

console.log("✅ Sign-in verified for:", signIn.user?.email);
console.log("\nLogin with:");
console.log("   email:    " + email);
console.log("   password: " + password);
