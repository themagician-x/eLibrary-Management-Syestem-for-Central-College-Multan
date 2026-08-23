/**
 * The canonical origin this deployment answers on.
 *
 * `NEXT_PUBLIC_SITE_URL` is the custom domain, set in Vercel. Without it we
 * fall back to the deployment Vercel gives every project, so previews and the
 * free *.vercel.app URL still produce correct absolute links — and localhost
 * still works with no env file at all.
 *
 * Every step here is defensive on purpose. An env var that is *present but
 * empty* — which is what you get from adding the key in Vercel and leaving the
 * value blank — is the normal case, not an odd one, and `??` does not catch it
 * because "" is neither null nor undefined. `new URL("")` then throws
 * ERR_INVALID_URL while collecting page data, and the whole build fails on a
 * blank field.
 */

/** Trim, and treat a blank value as absent — which `??` alone does not. */
function present(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function origin(): string {
  const explicit = present(process.env.NEXT_PUBLIC_SITE_URL);
  // a bare domain is the easy thing to type into Vercel, so accept it
  if (explicit) return /^https?:\/\//i.test(explicit) ? explicit : `https://${explicit}`;

  const vercel = present(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercel) return `https://${vercel}`;

  return `http://localhost:${present(process.env.PORT) ?? "3000"}`;
}

export const siteUrl = (() => {
  const candidate = origin();
  try {
    return new URL(candidate);
  } catch {
    // A malformed domain is a typo in a dashboard field. Wrong canonical links
    // are worth shipping; a failed deploy over one is not.
    console.warn(`[site] NEXT_PUBLIC_SITE_URL is not a valid URL: ${candidate}`);
    return new URL("http://localhost:3000");
  }
})();
