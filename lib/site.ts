/**
 * The canonical origin this deployment answers on.
 *
 * `NEXT_PUBLIC_SITE_URL` is the custom domain, set in Vercel. Without it we
 * fall back to the deployment Vercel gives every project, so previews and the
 * free *.vercel.app URL still produce correct absolute links — and localhost
 * still works with no env file at all.
 */
export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : `http://localhost:${process.env.PORT ?? 3000}`)
);
