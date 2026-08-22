// Refuses to let a destructive test script run against anything but a project
// explicitly marked as disposable.
//
// The milestone e2e suites begin by deleting whole tables. Pointed at the real
// library that is total loss of circulation and financial history, so the guard
// is opt-in: the project has to name itself as a test target.
//
// In the test project's .env.local add:
//   ALLOW_DESTRUCTIVE_TESTS=<the project ref from NEXT_PUBLIC_SUPABASE_URL>
//
// Naming the ref rather than using a bare "yes" means copying the env file to
// production doesn't silently carry permission along with it.
export function assertTestProject() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const allow = (process.env.ALLOW_DESTRUCTIVE_TESTS ?? "").trim();
  const ref = url.replace(/^https?:\/\//, "").split(".")[0];

  if (!ref) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL is not set — refusing to run.");
    process.exit(1);
  }

  if (allow !== ref) {
    console.error(
      "\n❌ Refusing to run: this script deletes every loan, fine and reservation.\n" +
        `   Target project : ${ref}\n` +
        `   Permitted      : ${allow || "(ALLOW_DESTRUCTIVE_TESTS not set)"}\n\n` +
        "   If this really is a disposable test project, add to its .env.local:\n" +
        `       ALLOW_DESTRUCTIVE_TESTS=${ref}\n\n` +
        "   Never set this on the production project.\n"
    );
    process.exit(1);
  }

  console.log(`· destructive tests permitted on test project "${ref}"`);
}
