"use client";

import type { ReactNode } from "react";
import { NavLink, useNavigate } from "@/marketing/router";
import { LEGAL_LINKS } from "@/lib/legal/documents";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/marketing/components/shared/Logo";
import { Reveal } from "@/marketing/components/shared/Reveal";
import { Button } from "@/marketing/components/ui/button";
import { SiteNavLink } from "@/marketing/components/shared/SiteLink";
import { useAuth } from "@/marketing/hooks/useAuth";
import { useSiteGlobal } from "@/marketing/lib/site-global";

/** Shared shell for the public marketing pages, consistent nav + footer. */
export function MarketingLayout({ children }: { children: ReactNode }) {
  const { pageHeader, footer } = useSiteGlobal();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const cta = isAuthenticated ? "/hub" : "/login";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <NavLink to="/" aria-label="Aquifert home" className="transition-opacity hover:opacity-80">
            <Logo size={34} />
          </NavLink>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {pageHeader.menu.map((n, i) => (
              <SiteNavLink
                key={i}
                href={n.link}
                className={(isActive) =>
                  `rounded-lg px-3.5 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                    isActive
                      ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
                      : "text-slate-700 hover:bg-muted hover:text-navy-800 dark:text-slate-300 dark:hover:text-white"
                  }`
                }
              >
                {n.label}
              </SiteNavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate(cta)}>{pageHeader.signInLabel}</Button>
            <Button className="bg-teal-500 text-white hover:bg-teal-600 aqf-btn-press" onClick={() => navigate(cta)}>
              {pageHeader.startLabel} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {children}

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            {LEGAL_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className="text-slate-500 hover:text-navy-700 dark:text-slate-400">
                {l.label}
              </NavLink>
            ))}
          </nav>
          {footer.tagline ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
              © {new Date().getFullYear()} {footer.tagline}
            </p>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

/** Solid navy CTA band, white text on a flat, high-contrast surface. */
export function CtaBand({ title, subtitle, ctaLabel = "Launch the demo" }: { title: string; subtitle?: string; ctaLabel?: string }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  return (
    <section className="aqf-cta-band">
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
          {subtitle ? <p className="mx-auto mt-4 max-w-xl leading-relaxed text-white">{subtitle}</p> : null}
          <Button
            size="lg"
            className="mt-8 bg-teal-600 font-semibold text-white hover:bg-teal-500 aqf-btn-press"
            onClick={() => navigate(isAuthenticated ? "/hub" : "/login")}
          >
            {ctaLabel} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
