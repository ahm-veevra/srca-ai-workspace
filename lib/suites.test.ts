// The suite registry is the frontend mirror of the canonical backend registry
// (GET /reference/suites) and the single source the sidebar nav is GENERATED from —
// the Phase 11 "nav can never drift" guarantee. These tests pin that structure.
import { describe, expect, it } from "vitest";

import { SUITES, suiteByKey, suiteForCenter } from "@/lib/suites";

describe("suite registry", () => {
  it("defines the five enterprise suites in canonical order", () => {
    expect(SUITES.map((s) => s.key)).toEqual([
      "v-core", "v-flow", "v-manage", "v-grow", "v-lead",
    ]);
  });

  it("every Center belongs to exactly one suite", () => {
    const seen = new Map<string, string>();
    for (const suite of SUITES) {
      for (const center of suite.centers) {
        expect(seen.has(center), `center '${center}' in both '${seen.get(center)}' and '${suite.key}'`).toBe(false);
        seen.set(center, suite.key);
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it("every suite is well-formed: name, domain, tagline, at least one center", () => {
    for (const suite of SUITES) {
      expect(suite.name).toMatch(/^V-/);
      expect(suite.domain).toBeTruthy();
      expect(suite.tagline).toBeTruthy();
      expect(suite.centers.length).toBeGreaterThan(0);
    }
  });

  it("every nav entry has a route, a label, and a sane permission gate", () => {
    for (const suite of SUITES) {
      expect(suite.nav.length).toBeGreaterThan(0);
      for (const item of suite.nav) {
        expect(item.href.startsWith("/")).toBe(true);
        expect(item.label).toBeTruthy();
        if (item.perm !== null) expect(item.perm).toMatch(/^[a-z_]+\.[a-z_]+$/);
      }
    }
  });

  it("nav routes are globally unique (one Center, one home)", () => {
    const hrefs = SUITES.flatMap((s) => s.nav.map((n) => n.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("suiteByKey and suiteForCenter resolve membership", () => {
    expect(suiteByKey("v-manage").name).toBe("V-Manage");
    expect(suiteForCenter("compliance")?.key).toBe("v-core");
    expect(suiteForCenter("knowledge")?.key).toBe("v-grow");
    expect(suiteForCenter("not-a-center")).toBeNull();
  });
});
