/**
 * LandingLayout, landing-page-only chrome in an institutional grammar:
 * 72px sticky main header with utility links folded in (border + shadow past
 * 100px scroll), deep multi-column footer with the Market Data registry.
 * MarketingLayout (used by every other page) is untouched.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { Menu, Search, X } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { OPEN_COOKIE_PREFS_EVENT } from "@/components/CookieConsent";
import { SiteSearch } from "@/components/SiteSearch";
import { trpc } from "@/providers/trpc";

const PRIMARY_NAV = [
  { to: "/", label: "Home" },
  { to: "/platform", label: "Platform" },
  { to: "/why-aquifert", label: "Why Aquifert" },
  { to: "/membership", label: "Membership" },
  { to: "/contact", label: "Contact" },
];

const UTILITY_NAV = [
  { to: "/help", label: "Help" },
  { to: "/contact", label: "Contact" },
];

/** Event the LeadMagnet modal listens for, Request access opens the lead form. */
export const OPEN_LEAD_MAGNET_EVENT = "aq:open-lead-magnet";

const MARKET_DATA_DISCLAIMER =
  "Fertilizer price indications are compiled from the sources listed above and from Aquifert desk assessments. Data may be delayed and is provided for information only. It does not constitute a price assessment, an offer, or advice. Verify independently before trading.";

/** Footer "Market Data" block, rendered FROM the price_sources registry,
 *  never hard-coded (licence compliance). Hidden when the registry is empty. */
function MarketDataBlock() {
  const { data: sources } = trpc.prices.sources.useQuery();
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-12 border-t border-white/10 pt-6">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Market Data
      </h3>
      <ul className="mt-3 grid gap-x-8 gap-y-2 text-[12px] sm:grid-cols-2">
        {sources.map((s) => (
          <li key={s.code}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 underline-offset-2 hover:text-white hover:underline"
            >
              {s.name}
            </a>
            <span className="text-slate-500">
              {" "}· data as of{" "}
              {s.dataAsOf
                ? new Date(s.dataAsOf).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
                : "N/A"}
            </span>
            {s.attributionText && (
              <span className="block text-[11px] leading-relaxed text-slate-500">{s.attributionText}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LandingLayout({ children }: { children: ReactNode }) {
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
          {PRIMARY_NAV.map((n) => (
            <NavLink
              key={n.label}
              to={n.to}
              className={({ isActive }) =>
                `relative py-2 text-[12px] font-semibold uppercase tracking-[0.1em] transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-navy-700 after:transition-opacity hover:text-navy-700 ${
                  isActive ? "text-navy-800 after:opacity-100" : "text-slate-600 after:opacity-0 hover:after:opacity-100"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-4 xl:flex" aria-label="Utility">
            {UTILITY_NAV.map((u) =>
              u.to.startsWith("mailto:") ? (
                <a
                  key={u.label}
                  href={u.to}
                  className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 hover:text-navy-800"
                >
                  {u.label}
                </a>
              ) : (
                <Link
                  key={u.label}
                  to={u.to}
                  className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 hover:text-navy-800"
                >
                  {u.label}
                </Link>
              ),
            )}
          </nav>
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
            Log in
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
            {PRIMARY_NAV.map((n) => (
              <NavLink
                key={n.label}
                to={n.to}
                className="border-b border-slate-100 py-4 text-sm font-semibold uppercase tracking-[0.1em] text-navy-800"
              >
                {n.label}
              </NavLink>
            ))}
            <div className="mt-4 flex flex-col gap-2">
              {UTILITY_NAV.map((u) =>
                u.to.startsWith("mailto:") ? (
                  <a key={u.label} href={u.to} className="py-1 text-[12px] font-medium uppercase tracking-[0.08em] text-slate-500">
                    {u.label}
                  </a>
                ) : (
                  <Link key={u.label} to={u.to} className="py-1 text-[12px] font-medium uppercase tracking-[0.08em] text-slate-500">
                    {u.label}
                  </Link>
                ),
              )}
            </div>
            <Link
              to="/login"
              className="mt-6 inline-flex h-11 items-center justify-center rounded border border-navy-700 px-4 text-sm font-semibold uppercase tracking-wide text-navy-800"
            >
              Log in
            </Link>
          </nav>
        </div>
      )}

      <main id="main-content">{children}</main>

      <SiteSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* 12, Footer */}
      <footer className="bg-navy-900 text-slate-300">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logo size={34} light />
              <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-slate-400">
                Aquifert specialises in the trading and distribution of specialty fertilizers,
                including water solubles and micronutrients, connecting global producers and
                buyers through one governed platform.
              </p>
              <p className="mt-4 text-[13px] text-slate-400">
                @Aquiferts ·{" "}
                <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" className="text-white underline-offset-2 hover:underline">
                  LinkedIn
                </a>{" "}
                ·{" "}
                <a href="mailto:enquiry@aquifert.com" className="text-white underline-offset-2 hover:underline">
                  enquiry@aquifert.com
                </a>
              </p>
            </div>
            <nav aria-label="Platform">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Platform</h3>
              <ul className="mt-4 space-y-2 text-[13px]">
                {["Aquifert ONE", "Freight Calculator", "Netback", "Library", "Tools", "Order Desk"].map((l) => (
                  <li key={l}>
                    <Link to="/platform" className="text-slate-300 hover:text-white">{l}</Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Company">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Company</h3>
              <ul className="mt-4 space-y-2 text-[13px]">
                <li><Link to="/why-aquifert" className="text-slate-300 hover:text-white">Why Aquifert</Link></li>
                <li><Link to="/membership" className="text-slate-300 hover:text-white">Membership</Link></li>
                <li><Link to="/contact" className="text-slate-300 hover:text-white">Contact</Link></li>
                <li><Link to="/platform" className="text-slate-300 hover:text-white">Help</Link></li>
                <li><Link to="/why-aquifert" className="text-slate-300 hover:text-white">Careers</Link></li>
              </ul>
            </nav>
            <nav aria-label="Legal">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Legal</h3>
              <ul className="mt-4 space-y-2 text-[13px]">
                {["Terms of Service", "Privacy Policy", "Cookie Policy", "Data Sources", "Disclaimer"].map((l) => (
                  <li key={l}>
                    <Link to="/why-aquifert" className="text-slate-300 hover:text-white">{l}</Link>
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
          <MarketDataBlock />
          <div className="mt-12 border-t border-white/10 pt-6">
            <p className="text-[12px] text-slate-400">© 2026 Aquifert. All rights reserved.</p>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{MARKET_DATA_DISCLAIMER}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
