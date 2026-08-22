// Admin credentials for the scripts, read from the environment only.
// Nothing here has a default — a missing value stops the script rather than
// silently falling back to a password that would end up in the repo.
//
// Supply them via .env.local (gitignored):
//   ADMIN_EMAIL=admin@central.edu.pk
//   ADMIN_PASSWORD=…
export function adminCredentials() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      "❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set.\n" +
        "   Add them to .env.local and run with:  node --env-file=.env.local <script>"
    );
    process.exit(1);
  }
  return { email, password };
}
