"use client";

/**
 * LandingLayout, the chrome of every public page in an institutional grammar:
 * 72px sticky main header with utility links folded in (border + shadow past
 * 100px scroll), deep multi-column footer, cookie banner and the request-access form.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "@/marketing/router";
import { Menu, Search, X } from "lucide-react";
import { Logo } from "@/marketing/components/shared/Logo";
import { SiteLink, SiteNavLink } from "@/marketing/components/shared/SiteLink";
import { CookieConsent, OPEN_COOKIE_PREFS_EVENT } from "@/marketing/components/CookieConsent";
import { SiteSearch } from "@/marketing/components/SiteSearch";
import { COMPANY_DETAILS, LEGAL_LINKS } from "@/lib/legal/documents";
import { fillYear } from "@/lib/site-content/normalize";
import { useSiteGlobal } from "@/marketing/lib/site-global";

export function LandingLayout({ children }: { children: ReactNode }) {
  const { header, footer } = useSiteGlobal();
  const footerColumns = [
    { title: footer.firstTitle, links: footer.firstLinks },
    { title: footer.secondTitle, links: footer.secondLinks },
  ].filter((column) => column.title && column.links.length);
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setDrawer(false), [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  return (
    <div className="min-h-screen bg-white text-navy-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy-800"
      >
        Skip to content
      </a>

      {/* 1, Main header (utility links folded in) */}
      <header
        className={`sticky top-0 z-50 flex h-[72px] items-center justify-between bg-white px-4 transition-shadow sm:px-6 ${
          scrolled ? "border-b border-slate-200 shadow-[0_2px_12px_-4px_rgb(14_32_49/0.18)]" : ""
        }`}
      >
        <Link to="/" aria-label="Aquifert home">
          <Logo size={36} />
        </Link>
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {header.menu.map((n, i) => (
            <SiteNavLink
              key={i}
              href={n.link}
              className={(isActive) =>
                `relative py-2 text-[12px] font-semibold uppercase tracking-[0.1em] transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-navy-700 after:transition-opacity hover:text-navy-700 ${
                  isActive ? "text-navy-800 after:opacity-100" : "text-slate-600 after:opacity-0 hover:after:opacity-100"
                }`
              }
            >
              {n.label}
            </SiteNavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {header.utility.length ? (
            <nav className="hidden items-center gap-4 xl:flex" aria-label="Utility">
              {header.utility.map((u, i) => (
                <SiteLink key={i} href={u.link} className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 hover:text-navy-800">
                  {u.label}
                </SiteLink>
              ))}
            </nav>
          ) : null}
          <button
            type="button"
            aria-label="Search the website"
            aria-haspopup="dialog"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-navy-800"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
          <Link
            to="/login"
            className="hidden h-9 items-center text-[12px] font-semibold uppercase tracking-wide text-navy-800 underline-offset-4 hover:underline sm:inline-flex"
          >
            {header.loginLabel}
          </Link>
          <Link
            to="/register"
            className="hidden h-9 items-center rounded bg-navy-700 px-4 text-[12px] font-semibold uppercase tracking-wide text-white hover:bg-navy-800 sm:inline-flex"
          >
            {header.accessLabel}
          </Link>
          <button
            type="button"
            aria-label={drawer ? "Close menu" : "Open menu"}
            aria-expanded={drawer}
            onClick={() => setDrawer((d) => !d)}
            className="flex h-9 w-9 items-center justify-center rounded text-navy-800 hover:bg-slate-100 lg:hidden"
          >
            {drawer ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 top-[72px] z-40 bg-white lg:hidden" role="dialog" aria-label="Menu">
          <nav className="flex flex-col gap-1 px-6 py-6" aria-label="Mobile">
            {header.menu.map((n, i) => (
              <SiteNavLink key={i} href={n.link} className={() => "border-b border-slate-100 py-4 text-sm font-semibold uppercase tracking-[0.1em] text-navy-800"}>
                {n.label}
              </SiteNavLink>
            ))}
            {header.utility.length ? (
              <div className="mt-4 flex flex-col gap-2">
                {header.utility.map((u, i) => (
                  <SiteLink key={i} href={u.link} className="py-1 text-[12px] font-medium uppercase tracking-[0.08em] text-slate-500">
                    {u.label}
                  </SiteLink>
                ))}
              </div>
            ) : null}
            <Link
              to="/login"
              className="mt-6 inline-flex h-11 items-center justify-center rounded border border-navy-700 px-4 text-sm font-semibold uppercase tracking-wide text-navy-800"
            >
              {header.loginLabel}
            </Link>
            <Link
              to="/register"
              className="mt-2 inline-flex h-11 items-center justify-center rounded bg-navy-700 px-4 text-sm font-semibold uppercase tracking-wide text-white"
            >
              {header.accessLabel}
            </Link>
          </nav>
        </div>
      )}

      <main id="main-content">{children}</main>

      <SiteSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      <CookieConsent />

      {/* 12, Footer */}
      <footer className="bg-navy-900 text-slate-300">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className={`grid gap-10 md:grid-cols-2 ${["lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4"][footerColumns.length]}`}>
            <div>
              <Logo size={34} light />
              {footer.about ? <p className="mt-4 max-w-xs whitespace-pre-line text-[13px] leading-relaxed text-slate-400">{footer.about}</p> : null}
              <p className="mt-4 text-[13px] text-slate-400">
                {[
                  footer.handle ? <span key="handle">{footer.handle}</span> : null,
                  footer.linkedin ? (
                    <a key="linkedin" href={footer.linkedin} target="_blank" rel="noopener noreferrer" className="text-white underline-offset-2 hover:underline">
                      LinkedIn
                    </a>
                  ) : null,
                  <a key="email" href={`mailto:${footer.email}`} className="text-white underline-offset-2 hover:underline">
                    {footer.email}
                  </a>,
                ]
                  .filter(Boolean)
                  .flatMap((part, i) => (i ? [<span key={`dot-${i}`}> · </span>, part] : [part]))}
              </p>
            </div>
            {footerColumns.map((column, c) => (
              <nav key={c} aria-label={column.title}>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{column.title}</h3>
                <ul className="mt-4 space-y-2 text-[13px]">
                  {column.links.map((l, i) => (
                    <li key={i}>
                      <SiteLink href={l.link} className="text-slate-300 hover:text-white">
                        {l.label}
                      </SiteLink>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <nav aria-label="Legal">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Legal</h3>
              <ul className="mt-4 space-y-2 text-[13px]">
                {LEGAL_LINKS.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-slate-300 hover:text-white">{l.label}</Link>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_PREFS_EVENT))}
                    className="text-slate-300 hover:text-white"
                  >
                    Cookie preferences
                  </button>
                </li>
              </ul>
            </nav>
          </div>
          <div className="mt-12 border-t border-white/10 pt-6">
            {footer.copyright ? <p className="text-[12px] text-slate-400">{fillYear(footer.copyright)}</p> : null}
            <p className="mt-1 text-[12px] text-slate-400">{COMPANY_DETAILS}</p>
            {footer.disclaimer ? <p className="mt-3 whitespace-pre-line text-[11px] leading-relaxed text-slate-500">{footer.disclaimer}</p> : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
