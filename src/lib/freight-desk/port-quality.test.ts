import assert from "node:assert/strict";
import test from "node:test";
import { PORTS, type PortRecord } from "@/lib/ports";
import { auditPorts, locationProblem } from "./port-quality";

const kinds = (issues: Map<string, { kind: string }[]>, code: string) => (issues.get(code) ?? []).map((issue) => issue.kind);

test("the built-in registry flags only the ports that need a look", () => {
  const issues = auditPorts(PORTS);
  assert.ok(kinds(issues, "QARL").includes("code-format"));
  assert.ok(kinds(issues, "BOBUR").includes("code-country"));
  assert.equal(issues.has("EGDAM"), false);
  assert.equal(issues.has("INBOM"), false);
  assert.ok(issues.size < 20, `expected a short review list, got ${issues.size}`);
});

test("duplicates, bad coordinates and unknown countries are caught", () => {
  const base: PortRecord = { code: "EGDAM", name: "Damietta", country: "Egypt", region: "North Africa", lat: 31.47, lon: 31.76 };
  const issues = auditPorts([
    base,
    { ...base, code: "EGDAM", name: "Damietta East" },
    { ...base, code: "EGDA2" },
    { ...base, code: "EGXXX", name: "Nowhere", lat: 0, lon: 0 },
    { ...base, code: "ZZABC", name: "Mystery", country: "Atlantis" },
  ]);
  assert.ok(kinds(issues, "EGDAM").includes("duplicate-code"));
  assert.ok(kinds(issues, "EGDA2").includes("duplicate-name"));
  assert.ok(kinds(issues, "EGXXX").includes("coordinates"));
  assert.ok(kinds(issues, "ZZABC").includes("country"));
});

test("coordinates outside the port's region are flagged", () => {
  assert.equal(locationProblem({ lat: 31.47, lon: 31.76, region: "North Africa" }), null);
  assert.equal(locationProblem({ lat: 31.47, lon: 31.76, region: "Baltic" }), "region");
  assert.equal(locationProblem({ lat: 95, lon: 10, region: "Baltic" }), "coordinates");
});
