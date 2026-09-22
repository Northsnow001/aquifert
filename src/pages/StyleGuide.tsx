// Aquifert ONE, Design System style guide (foundation step; no existing page touched)
import React, { useMemo, useState } from "react";
import {
  AqButton, AqInput, AqSelect, AqCheckbox, AqRadio, AqCard, AqTag, AqBadge,
  AqMarketTable, AqDataDisclaimer, AqSourceAttribution, AqSkeleton,
  AqEmpty, AqError, AqModal, AqToast, AqAccordion, AqTabs, AqBreadcrumb,
} from "@/components/ds";

/* ---------- WCAG contrast check (runs live on the page) ---------- */
function relLum(hex: string) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [l1, l2] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const LIGHT = {
  canvas: "#EDF4FC", raised: "#FFFFFF", sunken: "#D8DFE6",
  text: "#090E13", secondary: "#5E646B", primary: "#356793", onPrimary: "#FFFFFF",
  up: "#005D39", down: "#9B1E22", border: "#7F858C",
};
const DARK = {
  canvas: "#0B1015", raised: "#13191F", sunken: "#060A0E",
  text: "#EAEFF4", secondary: "#9FA5AC", primary: "#5185B3", onPrimary: "#0B1420",
  up: "#61D19A", down: "#F66D67", border: "#55616C",
};

const RAMPS: Record<string, string[]> = {
  primary: ["#EAF5FF", "#D0E0EF", "#ACC6DE", "#83A9CC", "#5C89B2", "#356793", "#1A4B72", "#073455", "#00203B", "#000E22"],
  accent: ["#EDF6F3", "#D4E2DD", "#B2C8C2", "#8CADA4", "#678E83", "#426D62", "#285047", "#163931", "#05241D", "#00110D"],
  deep: ["#EBF5FE", "#D2E0EE", "#AFC5DC", "#87A8C9", "#6289AF", "#3C678F", "#234A6F", "#113353", "#021F39", "#000E21"],
  grey: ["#EDF4FC", "#D8DFE6", "#BCC3CB", "#9FA5AD", "#7F858C", "#5E646B", "#42484F", "#2D3238", "#191F24", "#090E13"],
};
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

function Section({ id, title, sub, children }: { id: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-t border-[var(--aq-border-subtle)] py-12 first:border-0 md:py-20">
      <p className="aq-label text-[var(--aq-brand-primary)]">{id}</p>
      <h2 className="aq-h2 mt-1">{title}</h2>
      {sub && <p className="aq-body mt-2 max-w-3xl text-[var(--aq-text-secondary)]">{sub}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

const SAMPLE_ROWS = [
  { product: "Urea 46% Granular, FOB Middle East", price: "392.50", change: 4.25, pct: 1.09, updated: "09:42 GMT" },
  { product: "DAP 18-46-0, CFR West Africa", price: "618.00", change: -6.5, pct: -1.04, updated: "09:31 GMT" },
  { product: "NPK 15-15-15, CFR East Africa", price: "505.00", change: 0, pct: 0, updated: "08:57 GMT" },
  { product: "MOP 60%, FOB Baltic", price: "344.75", change: 2.75, pct: 0.8, updated: "09:15 GMT" },
];

export default function StyleGuide() {
  const [dark, setDark] = useState(() => new URLSearchParams(window.location.search).get("theme") === "dark");
  const [modalOpen, setModalOpen] = useState(false);
  const T = dark ? DARK : LIGHT;

  const checks = useMemo(() => ([
    { pair: "text-primary on canvas", a: T.text, b: T.canvas, min: 4.5 },
    { pair: "text-secondary on canvas", a: T.secondary, b: T.canvas, min: 4.5 },
    { pair: "text-primary on raised", a: T.text, b: T.raised, min: 4.5 },
    { pair: "text-secondary on raised", a: T.secondary, b: T.raised, min: 4.5 },
    { pair: "price-up on canvas", a: T.up, b: T.canvas, min: 4.5 },
    { pair: "price-down on canvas", a: T.down, b: T.canvas, min: 4.5 },
    { pair: "on-primary on brand-primary", a: T.onPrimary, b: T.primary, min: 4.5 },
    { pair: "border-strong on canvas (UI 3:1)", a: T.border, b: T.canvas, min: 3 },
  ].map((c) => ({ ...c, ratio: contrast(c.a, c.b) }))), [T]);

  return (
    <div className={`aq min-h-screen ${dark ? "dark" : ""}`} style={{ background: "var(--aq-surface-canvas)" }}>
      {/* sticky header: quiet chrome, shadow only once floating */}
      <header className="sticky top-0 z-40 border-b border-[var(--aq-border-subtle)] bg-[var(--aq-surface-raised)]">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="aq-h3" style={{ fontFamily: "var(--aq-font-display)" }}>Aquifert <span style={{ color: "var(--aq-brand-primary)" }}>ONE</span></span>
            <AqTag>Design System v1.0</AqTag>
          </div>
          <div className="flex items-center gap-3">
            <span className="aq-label text-[var(--aq-text-secondary)]">{dark ? "Dark" : "Light"} theme</span>
            <button
              onClick={() => setDark(!dark)}
              aria-pressed={dark}
              className="relative h-6 w-11 rounded-full border border-[var(--aq-border-strong)] bg-[var(--aq-surface-sunken)]"
            >
              <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-[var(--aq-brand-primary)] transition-all ${dark ? "left-6" : "left-0.5"}`} style={{ height: 18, width: 18 }} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-6 pb-24">
        {/* hero */}
        <div className="py-16 md:py-24">
          <p className="aq-label text-[var(--aq-brand-primary)]">Foundation · Not a page rebuild</p>
          <h1 className="aq-display-1 mt-3 max-w-4xl">Institutional discipline, Aquifert colour.</h1>
          <p className="aq-body-lg mt-4 max-w-2xl text-[var(--aq-text-secondary)]">
            Every token, the full type scale, and every component in all four states, in both themes.
            Structure borrowed from the discipline of financial exchanges; colour, logo and voice remain Aquifert's.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <AqBadge tone="brand">WCAG 2.2 AA</AqBadge>
            <AqBadge tone="up">▲ Contrast-checked live below</AqBadge>
            <AqBadge>tabular-nums everywhere numeric</AqBadge>
          </div>
        </div>

        {/* 01 COLOUR */}
        <Section id="01 · Colour" title="Brand ramps, derived in OKLCH"
          sub="Hue constant per ramp, lightness stepped evenly from the logo values (blue #31648F, green #6E9A8E, deep #254F76). The neutral ramp is brand-deep desaturated to ~4% chroma, so every grey carries a faint brand cast. Chrome is quiet; data is loud.">
          {Object.entries(RAMPS).map(([name, colors]) => (
            <div key={name} className="mb-6">
              <p className="aq-label mb-2 text-[var(--aq-text-secondary)]">--aq-{name}-50 → 900</p>
              <div className="grid grid-cols-5 gap-1 md:grid-cols-10">
                {colors.map((c, i) => (
                  <figure key={c} className="overflow-hidden rounded-[4px] border border-[var(--aq-border-subtle)]">
                    <div className="h-12" style={{ background: c }} />
                    <figcaption className="bg-[var(--aq-surface-raised)] px-1.5 py-1">
                      <span className="aq-label block text-[var(--aq-text-secondary)]">{STEPS[i]}</span>
                      <span className="aq-data block text-[0.6875rem] text-[var(--aq-text-secondary)]">{c}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["--aq-price-up", T.up, "▲ +4.25 (+1.09%), always paired with arrow and signed number"],
              ["--aq-price-down", T.down, "▼ −6.50 (−1.04%), hue-distinct from all brand hues"],
              ["--aq-price-flat", T.secondary, "– 0.00 (0.00%), equals text-secondary"],
            ].map(([tok, col, label]) => (
              <div key={tok} className="rounded-[8px] border border-[var(--aq-border-subtle)] bg-[var(--aq-surface-raised)] p-4">
                <span className="inline-block h-8 w-8 rounded-[4px] border border-[var(--aq-border-subtle)]" style={{ background: col }} />
                <p className="aq-data mt-2 text-[var(--aq-text-primary)]">{tok}</p>
                <p className="aq-small text-[var(--aq-text-secondary)]">{label}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 02 TYPOGRAPHY */}
        <Section id="02 · Typography" title="Archivo for display, Inter for UI, IBM Plex Mono for data"
          sub="font-display: swap via Google Fonts. Every numeric value in the product uses tabular-nums, non-tabular figures in a price column are a bug.">
          <div className="space-y-6 border-b border-[var(--aq-border-subtle)] pb-8">
            {[
              ["aq-display-1 · 3.5rem/1.05/700/−0.03em", "aq-display-1", "Nitrogen markets hold firm"],
              ["aq-display-2 · 2.75rem/1.10/700/−0.025em", "aq-display-2", "Nitrogen markets hold firm"],
              ["aq-h1 · 2.25rem/1.15/600/−0.02em", "aq-h1", "Nitrogen markets hold firm"],
              ["aq-h2 · 1.75rem/1.20/600", "aq-h2", "Nitrogen markets hold firm"],
              ["aq-h3 · 1.25rem/1.30/600", "aq-h3", "Nitrogen markets hold firm"],
            ].map(([spec, cls, sample]) => (
              <div key={spec}>
                <p className="aq-label mb-1 text-[var(--aq-text-secondary)]">{spec}</p>
                <p className={`${cls} text-[var(--aq-text-primary)]`}>{sample}</p>
              </div>
            ))}
            <div>
              <p className="aq-label mb-1 text-[var(--aq-text-secondary)]">aq-body-lg · 1.125rem/1.60</p>
              <p className="aq-body-lg max-w-2xl text-[var(--aq-text-primary)]">Urea sentiment firmed through the week as fresh import demand met limited spot availability.</p>
            </div>
            <div>
              <p className="aq-label mb-1 text-[var(--aq-text-secondary)]">aq-body · 1rem/1.60</p>
              <p className="aq-body max-w-2xl text-[var(--aq-text-primary)]">Urea sentiment firmed through the week as fresh import demand met limited spot availability.</p>
            </div>
            <div>
              <p className="aq-label mb-1 text-[var(--aq-text-secondary)]">aq-small · 0.875rem/1.50, aq-label · 0.75rem/600/+0.08em</p>
              <p className="aq-small text-[var(--aq-text-secondary)]">Urea sentiment firmed through the week as fresh import demand met limited spot availability.</p>
            </div>
            <div>
              <p className="aq-label mb-1 text-[var(--aq-text-secondary)]">aq-data · IBM Plex Mono 0.9375rem/500/tabular-nums</p>
              <p className="aq-data text-[var(--aq-text-primary)]">392.50&nbsp;&nbsp;1,240.00&nbsp;&nbsp;▲ +4.25 (+1.09%)&nbsp;&nbsp;2026-09-18 09:42 GMT</p>
            </div>
          </div>
        </Section>

        {/* 03 LAYOUT */}
        <Section id="03 · Layout grammar" title="12 columns, 1280px, 24px gutters"
          sub="4px spacing scale: 4 8 12 16 24 32 48 64 80 120. Radii: 4px controls, 8px cards, 12px overlays, nothing rounder. Borders over shadows; shadows only on genuinely floating elements. Section separators are a single 1px rule, never a coloured band.">
          <div className="grid grid-cols-12 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-16 rounded-[4px] border border-[var(--aq-border-subtle)] bg-[var(--aq-surface-raised)]" />
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-end gap-6">
            {[4, 8, 12].map((r) => (
              <figure key={r} className="text-center">
                <div className="h-16 w-16 border border-[var(--aq-border-strong)] bg-[var(--aq-surface-raised)]" style={{ borderRadius: r }} />
                <figcaption className="aq-label mt-1 text-[var(--aq-text-secondary)]">{r}px</figcaption>
              </figure>
            ))}
            {[4, 8, 12, 16, 24, 32, 48, 64, 80, 120].map((s) => (
              <figure key={s} className="text-center">
                <div className="bg-[var(--aq-brand-primary)]" style={{ width: Math.min(s, 80), height: 8 }} />
                <figcaption className="aq-label mt-1 text-[var(--aq-text-secondary)]">{s}</figcaption>
              </figure>
            ))}
          </div>
        </Section>

        {/* 04 COMPONENTS */}
        <Section id="04 · Components" title="Every component, all four states"
          sub="Default · loading (skeleton matching final layout, zero layout shift) · empty (explanation + action, never a blank box) · error (what failed + what to do + retry).">

          <p className="aq-label mb-3 text-[var(--aq-text-secondary)]">Button, primary / secondary / ghost / link × sm / md / lg</p>
          <div className="flex flex-wrap items-center gap-3">
            <AqButton size="sm">Request quote</AqButton>
            <AqButton>Request quote</AqButton>
            <AqButton size="lg">Request quote</AqButton>
            <AqButton variant="secondary">Secondary</AqButton>
            <AqButton variant="ghost">Ghost</AqButton>
            <AqButton variant="link">Link button</AqButton>
            <AqButton loading>Saving</AqButton>
            <AqButton disabled>Disabled</AqButton>
          </div>

          <p className="aq-label mb-3 mt-10 text-[var(--aq-text-secondary)]">Input · Select · Checkbox · Radio</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <AqInput placeholder="Tonnage (MT)" inputMode="decimal" />
              <AqInput invalid defaultValue="not-a-number" aria-invalid="true" />
              <AqSelect defaultValue="FOB"><option>FOB</option><option>CFR</option><option>CIF</option><option>EXW</option></AqSelect>
            </div>
            <div className="space-y-3">
              <AqCheckbox label="Confirm specification matches RFQ" defaultChecked />
              <div className="flex gap-6">
                <AqRadio name="basis" label="Granular" defaultChecked />
                <AqRadio name="basis" label="Prilled" />
              </div>
              <AqSkeleton className="h-10 w-full" />
            </div>
          </div>

          <p className="aq-label mb-3 mt-10 text-[var(--aq-text-secondary)]">MarketTable, borderless, right-aligned tabular numerics, sticky header · PriceCell, value + arrow + signed change + signed %</p>
          <AqMarketTable rows={SAMPLE_ROWS} caption="Indicative fertilizer prices" />
          <AqDataDisclaimer>Indicative levels only; not an offer. Prices are delayed and may not reflect executable markets.</AqDataDisclaimer>
          <div className="mt-1"><AqSourceAttribution source="Aquifert TELEX desk assessment" /></div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <AqCard title="Loading">
              <AqSkeleton className="h-4 w-2/3" />
              <AqSkeleton className="mt-2 h-4 w-full" />
              <AqSkeleton className="mt-2 h-8 w-full" />
            </AqCard>
            <AqCard title="Empty"><AqEmpty title="No price series pinned yet." action="Pin your first series" /></AqCard>
            <AqCard title="Error"><AqError what="The TELEX feed did not respond (timeout after 5s)." /></AqCard>
          </div>

          <p className="aq-label mb-3 mt-10 text-[var(--aq-text-secondary)]">Tag · Badge · Toast · Modal · Accordion · Tabs · Breadcrumb</p>
          <div className="flex flex-wrap items-center gap-3">
            <AqTag>Urea 46%</AqTag><AqTag tone="brand">FOB</AqTag><AqTag tone="accent">Confirmed spec</AqTag>
            <AqBadge tone="up">▲ Firm</AqBadge><AqBadge tone="down">▼ Soft</AqBadge><AqBadge>– Unchanged</AqBadge><AqBadge tone="brand">AQ ZERO</AqBadge>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <AqToast tone="up">Quote accepted, order AQ-1042 confirmed.</AqToast>
            <AqToast tone="down">Freight bid expired, request refreshed quotes.</AqToast>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <AqAccordion items={[
              { q: "What moves urea prices?", a: "Gas feedstock costs, export restrictions, seasonal import programmes and freight." },
              { q: "How often is TELEX updated?", a: "Assessments are published each business day by 17:00 GMT." },
            ]} />
            <AqCard>
              <AqTabs tabs={[
                { label: "FOB", content: <p className="aq-small text-[var(--aq-text-secondary)]">Free on board, buyer arranges freight.</p> },
                { label: "CFR", content: <p className="aq-small text-[var(--aq-text-secondary)]">Cost and freight, seller arranges ocean freight.</p> },
                { label: "Netback", content: <p className="aq-data text-[var(--aq-text-primary)]">618.00 − 42.50 freight − 6.00 insurance = 569.50</p> },
              ]} />
            </AqCard>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <AqBreadcrumb trail={["Aquifert ONE", "TELEX", "Nitrogen", "Urea 46%"]} />
            <AqButton variant="secondary" size="sm" onClick={() => setModalOpen(true)}>Open modal</AqButton>
          </div>
        </Section>

        {/* 05 ACCESSIBILITY */}
        <Section id="05 · Accessibility gate" title="Contrast, checked live on this page"
          sub="WCAG 2.2 AA: 4.5:1 text, 3:1 UI, in BOTH themes. Toggle the theme above; the table recomputes. Focus rings are visible on every interactive element; targets are ≥24px (44px touch); one h1 per page; semantic landmarks throughout.">
          <div className="overflow-hidden rounded-[8px] border border-[var(--aq-border-subtle)]">
            <table className="w-full text-[0.875rem]">
              <thead>
                <tr className="border-b border-[var(--aq-border-strong)] bg-[var(--aq-surface-raised)]">
                  {["Token pair", "Ratio", "Required", "Result"].map((h) => (
                    <th key={h} scope="col" className="aq-label px-4 py-2.5 text-left text-[var(--aq-text-secondary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-[var(--aq-surface-raised)]">
                {checks.map((c) => (
                  <tr key={c.pair} className="border-b border-[var(--aq-border-subtle)] last:border-0">
                    <td className="px-4 py-2.5 text-[var(--aq-text-primary)]">{c.pair}</td>
                    <td data-numeric className="px-4 py-2.5">{c.ratio.toFixed(2)}:1</td>
                    <td data-numeric className="px-4 py-2.5 text-[var(--aq-text-secondary)]">{c.min}:1</td>
                    <td className="px-4 py-2.5">
                      <AqBadge tone={c.ratio >= c.min ? "up" : "down"}>{c.ratio >= c.min ? "▲ PASS" : "▼ FAIL"}</AqBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AqDataDisclaimer>
            Ratios computed at runtime from the token hex values on this page, for the {dark ? "dark" : "light"} theme.
          </AqDataDisclaimer>
        </Section>
      </main>

      <footer style={{ background: "var(--aq-surface-dark)" }} className="py-10">
        <div className="mx-auto max-w-[1280px] px-6">
          <p className="aq-label" style={{ color: "#87A8C9" }}>Aquifert ONE · Design System v1.0</p>
          <p className="aq-small mt-2" style={{ color: "#9FA5AC" }}>
            Foundation only, no existing page, route, feature, form field or calculation was modified.
          </p>
        </div>
      </footer>

      <AqModal open={modalOpen} onClose={() => setModalOpen(false)} title="Confirm RFQ submission">
        Submit RFQ AQ-1042 for 5,000 MT Urea 46% granular to the trade desk? Shadows appear only on floating elements like this one (12px radius overlay).
      </AqModal>
    </div>
  );
}
