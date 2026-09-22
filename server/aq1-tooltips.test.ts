/**
 * AQ1 tooltip coverage test (brief Section 5): enumerates the AQ1 menu and
 * FAILS the build (`npm test` runs before deploy) if any item lacks a
 * registered tooltip or renders a literal "{...}" token.
 */
import { describe, expect, it } from "vitest";
import { AQ1_MENU, AQ1_TOOLTIPS } from "@contracts/aq1";

describe("AQ1 tooltip coverage", () => {
  it("covers 100% of the AQ1 menu", () => {
    for (const item of AQ1_MENU) {
      const tip = AQ1_TOOLTIPS[item.key];
      expect(tip, `missing tooltip for ${item.label}`).toBeTruthy();
      expect(tip.trim().length, `empty tooltip for ${item.label}`).toBeGreaterThan(20);
    }
    expect(Object.keys(AQ1_TOOLTIPS).sort()).toEqual(AQ1_MENU.map((m) => m.key).sort());
  });
  it("never renders a literal placeholder token", () => {
    for (const item of AQ1_MENU) {
      const rendered = AQ1_TOOLTIPS[item.key].replaceAll("{reports}", "2").replaceAll("{calcs}", "5");
      expect(rendered).not.toMatch(/\{[^}]*\}/);
    }
  });
});
