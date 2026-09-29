"use client";

import NextLink from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";
import { forwardRef, useCallback, useEffect, useMemo, type AnchorHTMLAttributes, type ReactNode } from "react";

type To = string | { pathname?: string; search?: string; hash?: string };

function href(to: To): string {
  if (typeof to === "string") return to;
  return `${to.pathname ?? ""}${to.search ?? ""}${to.hash ?? ""}`;
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: To;
  replace?: boolean;
  state?: unknown;
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, state: _state, ...rest },
  ref,
) {
  return <NextLink ref={ref} href={href(to)} replace={replace} {...rest} />;
});

type NavState = { isActive: boolean; isPending: boolean };

type NavLinkProps = Omit<LinkProps, "className" | "style" | "children"> & {
  end?: boolean;
  className?: string | ((s: NavState) => string | undefined);
  style?: React.CSSProperties | ((s: NavState) => React.CSSProperties | undefined);
  children?: ReactNode | ((s: NavState) => ReactNode);
};

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, end, className, style, children, ...rest },
  ref,
) {
  const pathname = usePathname() ?? "/";
  const target = href(to).split(/[?#]/)[0] || "/";
  const isActive = end || target === "/"
    ? pathname === target
    : pathname === target || pathname.startsWith(`${target.replace(/\/$/, "")}/`);
  const s: NavState = { isActive, isPending: false };
  return (
    <Link
      ref={ref}
      to={to}
      aria-current={isActive ? "page" : undefined}
      className={typeof className === "function" ? className(s) : className}
      style={typeof style === "function" ? style(s) : style}
      {...rest}
    >
      {typeof children === "function" ? children(s) : children}
    </Link>
  );
});

type NavigateOptions = { replace?: boolean; state?: unknown };

export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (to: To | number, opts?: NavigateOptions) => {
      if (typeof to === "number") {
        if (to < 0) router.back();
        else router.forward();
        return;
      }
      if (opts?.replace) router.replace(href(to));
      else router.push(href(to));
    },
    [router],
  );
}

/** Pathname-driven; search/hash are read from window so static pages need no Suspense boundary. */
export function useLocation() {
  const pathname = usePathname() ?? "/";
  return useMemo(() => {
    const inBrowser = typeof window !== "undefined";
    return {
      pathname,
      search: inBrowser ? window.location.search : "",
      hash: inBrowser ? window.location.hash : "",
      state: null as unknown,
    };
  }, [pathname]);
}

export function useSearchParams(): [URLSearchParams, (next: URLSearchParams | Record<string, string>) => void] {
  const params = useNextSearchParams();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const current = useMemo(() => new URLSearchParams(params?.toString() ?? ""), [params]);
  const set = useCallback(
    (next: URLSearchParams | Record<string, string>) => {
      const qs = new URLSearchParams(next as Record<string, string>).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname],
  );
  return [current, set];
}

export function Navigate({ to, replace }: { to: To; replace?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (replace) router.replace(href(to));
    else router.push(href(to));
  }, [router, to, replace]);
  return null;
}
