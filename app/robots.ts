import type { MetadataRoute } from "next";

/**
 * Nothing here is for the public.
 *
 * This is the librarian's admin tool and it holds student records, so it is
 * kept out of search engines entirely. The login gate is what actually
 * protects it — this only stops the login page itself being indexed and the
 * deployment showing up in results at all.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
