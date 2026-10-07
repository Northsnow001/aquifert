"use client";

import type { ReactNode } from "react";
import { useNavigate } from "@/marketing/router";
import { ArrowRight } from "lucide-react";
import { LandingLayout } from "@/marketing/components/LandingLayout";
import { Reveal } from "@/marketing/components/shared/Reveal";
import { Button } from "@/marketing/components/ui/button";
import { useAuth } from "@/marketing/hooks/useAuth";

/** Inner pages share the home page's header and footer, on their own page background. */
export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <LandingLayout>
      <div className="bg-background text-foreground">{children}</div>
    </LandingLayout>
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
