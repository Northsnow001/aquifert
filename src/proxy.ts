import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Signed-in visitors skip these and go straight to the hub. */
const SIGNED_IN_BOUNCE = new Set(["/", "/login", "/register"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isHub = pathname === "/hub" || pathname.startsWith("/hub/");
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let signedIn = false;

  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  } else {
    signedIn = Boolean(request.cookies.get("aq_demo")?.value);
  }

  if (!signedIn && isHub) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("redirect_to", `${pathname}${request.nextUrl.search}`);
    return redirectWithCookies(login, response);
  }

  if (signedIn && SIGNED_IN_BOUNCE.has(pathname)) {
    const requested = pathname === "/login" ? request.nextUrl.searchParams.get("redirect_to") : null;
    const dest = new URL(safePath(requested) ?? "/hub", request.url);
    return redirectWithCookies(dest, response);
  }

  return response;
}

function safePath(path: string | null): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path === "/login") return null;
  return path;
}

/** Keeps any session cookies Supabase refreshed during this request. */
function redirectWithCookies(to: URL, from: NextResponse) {
  const res = NextResponse.redirect(to);
  from.cookies.getAll().forEach((c) => res.cookies.set(c));
  return res;
}

export const config = {
  matcher: ["/", "/login", "/register", "/hub", "/hub/:path*"],
};
