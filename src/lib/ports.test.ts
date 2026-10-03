import assert from "node:assert/strict";
import test from "node:test";
import { portText, resolvePort, sameCountry, type PortRecord } from "./ports";

const ports: PortRecord[] = [
  { name: "Mombasa", country: "Kenya", region: "East Africa", code: "KEMBA", lat: -4.05, lon: 39.67 },
  { name: "Immingham", country: "UK", region: "North Europe", code: "GBIMM", lat: 53.63, lon: -0.19, aliases: ["Port of Immingham"] },
  { name: "Lagos", country: "Nigeria", region: "West Africa", code: "NGLOS", lat: 6.45, lon: 3.39 },
];

test("country names match across world and registry spellings", () => {
  assert.equal(sameCountry("United Kingdom", "UK"), true);
  assert.equal(sameCountry("kenya", "Kenya"), true);
  assert.equal(sameCountry("Kenya", "Nigeria"), false);
});

test("free text resolves to a registry port by code, label, name or alias", () => {
  assert.equal(resolvePort("KEMBA", ports)?.name, "Mombasa");
  assert.equal(resolvePort(portText(ports[1]), ports)?.code, "GBIMM");
  assert.equal(resolvePort("Mombasa, Kenya", ports)?.code, "KEMBA");
  assert.equal(resolvePort("Port of Immingham, United Kingdom", ports)?.code, "GBIMM");
  assert.equal(resolvePort("Lagos", ports)?.code, "NGLOS");
});

test("text that is not in the registry does not resolve", () => {
  assert.equal(resolvePort("Mombasa, Nigeria", ports), undefined);
  assert.equal(resolvePort("Nairobi", ports), undefined);
  assert.equal(resolvePort("XXABC", ports), undefined);
  assert.equal(resolvePort("", ports), undefined);
});
