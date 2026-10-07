import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ACTIVITY_COOKIE, ACTIVITY_COOKIE_OPTIONS, idleState, REAUTH_PATH, safeReturnPath } from "@/lib/idle-timeout";

/** Signed-in visitors skip these and go straight to the hub. */
const SIGNED_IN_BOUNCE = new Set(["/", "/login", "/register", REAUTH_PATH]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isHub = pathname === "/hub" || pathname.startsWith("/hub/");
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let signedIn = false;
  let signedInAt: string | undefined;
  let signOut = async () => {};

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
    signedInAt = data.user?.last_sign_in_at;
    signOut = async () => {
      await supabase.auth.signOut({ scope: "local" });
    };
  } else {
    signedIn = Boolean(request.cookies.get("aq_demo")?.value);
  }

  // Page loads and prefetches never count as activity; only the browser's heartbeat does.
  if (signedIn && (isHub || isAdmin)) {
    const idle = idleState(request.cookies.get(ACTIVITY_COOKIE)?.value, { signedInAt });
    if (idle === "expired") {
      await signOut();
      const reauth = new URL(REAUTH_PATH, request.url);
      reauth.searchParams.set("redirect_to", `${pathname}${request.nextUrl.search}`);
      const res = redirectWithCookies(reauth, response);
      res.cookies.delete(ACTIVITY_COOKIE);
      res.cookies.delete("aq_demo");
      return res;
    }
    if (idle === "fresh") response.cookies.set(ACTIVITY_COOKIE, String(Date.now()), ACTIVITY_COOKIE_OPTIONS);
  }

  if (!signedIn && isHub) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("redirect_to", `${pathname}${request.nextUrl.search}`);
    return redirectWithCookies(login, response);
  }

  const previewingHome = pathname === "/" && request.nextUrl.searchParams.has("preview");
  if (signedIn && SIGNED_IN_BOUNCE.has(pathname) && !previewingHome) {
    const requested = pathname === "/login" || pathname === REAUTH_PATH ? request.nextUrl.searchParams.get("redirect_to") : null;
    const dest = new URL(safeReturnPath(requested) ?? "/hub", request.url);
    return redirectWithCookies(dest, response);
  }

  return response;
}

/** Keeps any session cookies Supabase refreshed during this request. */
function redirectWithCookies(to: URL, from: NextResponse) {
  const res = NextResponse.redirect(to);
  from.cookies.getAll().forEach((c) => res.cookies.set(c));
  return res;
}

export const config = {
  matcher: ["/", "/login", "/register", "/session-expired", "/hub", "/hub/:path*", "/admin", "/admin/:path*"],
};
