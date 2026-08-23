import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 Proxy (formerly Middleware).
 * Refreshes the Supabase session on every request and gates the app behind
 * the single admin login: unauthenticated visitors are sent to /login,
 * and a logged-in admin visiting /login is bounced to the dashboard.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without these, createServerClient throws and — because this runs on every
  // matched path — the whole deployment answers 500 with a bare "Internal
  // Server Error". Saying so plainly turns half an hour of guessing into a
  // one-line fix. Both are NEXT_PUBLIC_, so they are read at build time: they
  // must be set in Vercel *and* the project redeployed, not just restarted.
  if (!url?.trim() || !anonKey?.trim()) {
    const missing = [
      !url?.trim() && "NEXT_PUBLIC_SUPABASE_URL",
      !anonKey?.trim() && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ].filter(Boolean);
    console.error(`[proxy] Supabase is not configured — missing ${missing.join(" and ")}`);
    return new NextResponse(
      `This deployment is not configured yet.\n\n` +
        `Missing: ${missing.join(", ")}\n\n` +
        `Set them in the hosting project's environment variables and redeploy.\n` +
        `They are build-time values, so a restart alone will not pick them up.\n`,
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/login";

  if (!user && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // run on everything except static assets, the Next internals, and
  // robots.txt — a crawler must be able to read that without logging in
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
