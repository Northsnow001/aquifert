import { countryCode } from "@/lib/flags";
import type { PortRecord } from "@/lib/ports";

export type PortIssueKind = "code-format" | "code-country" | "duplicate-code" | "duplicate-name" | "region-location" | "coordinates" | "country";

export type PortIssue = { kind: PortIssueKind; message: string };

export const ISSUE_LABEL: Record<PortIssueKind, string> = {
  "code-format": "Code format",
  "code-country": "Code and country",
  "duplicate-code": "Duplicate code",
  "duplicate-name": "Duplicate name",
  "region-location": "Region",
  coordinates: "Coordinates",
  country: "Country",
};

type Box = [latMin: number, latMax: number, lonMin: number, lonMax: number];

/** Generous boxes around each trading region. A port outside all of its region's boxes is probably misfiled. */
const REGION_BOXES: Record<string, Box[]> = {
  Baltic: [[53, 67, 9, 31]],
  "Northern Europe": [[49, 72, -11, 45]],
  "Atlantic Europe": [[35.5, 67, -25, 3]],
  Mediterranean: [[29, 46.5, -6.5, 37]],
  "Black Sea": [[36, 48, 26, 55]],
  "North Africa": [[19, 38, -18, 36]],
  "West Africa": [[-19, 28, -26, 15]],
  "Southern Africa": [[-36, -11, 10, 51]],
  "East Africa": [[-27, 22, 31, 52]],
  "Middle East": [[11, 38, 32, 62]],
  "Indian Subcontinent": [[4, 32, 60, 93]],
  "Southeast Asia": [[-12, 24, 92, 142]],
  "East Asia": [[18, 62, 103, 160]],
  Oceania: [
    [-48, 0, 110, 180],
    [-48, 0, -180, -150],
  ],
  "North America": [
    [14, 72, -170, -50],
    [17, 23, -161, -154],
  ],
  "Central America": [[7, 33, -118, -77]],
  Caribbean: [[9, 28, -86, -58]],
  "South America": [[-56, 13, -82, -34]],
};

const inBox = (lat: number, lon: number, [a, b, c, d]: Box) => lat >= a && lat <= b && lon >= c && lon <= d;

export function locationProblem(port: Pick<PortRecord, "lat" | "lon" | "region">) {
  if (!Number.isFinite(port.lat) || !Number.isFinite(port.lon) || Math.abs(port.lat) > 90 || Math.abs(port.lon) > 180) return "coordinates";
  if (port.lat === 0 && port.lon === 0) return "coordinates";
  const boxes = REGION_BOXES[port.region];
  if (boxes && !boxes.some((box) => inBox(port.lat, port.lon, box))) return "region";
  return null;
}

export const CODE_PATTERN = /^[A-Z]{2}[A-Z0-9]{3}$/;

/** Checks every port against the registry. Returns only ports that have something to review. */
export function auditPorts(ports: PortRecord[]): Map<string, PortIssue[]> {
  const issues = new Map<string, PortIssue[]>();
  const add = (code: string, issue: PortIssue) => issues.set(code, [...(issues.get(code) ?? []), issue]);
  const codes = new Map<string, number>();
  const names = new Map<string, string[]>();
  for (const port of ports) {
    codes.set(port.code, (codes.get(port.code) ?? 0) + 1);
    const key = `${port.country.toLowerCase()}|${port.name.toLowerCase()}`;
    names.set(key, [...(names.get(key) ?? []), port.code]);
  }

  for (const port of ports) {
    const iso = countryCode(port.country);
    if (!CODE_PATTERN.test(port.code)) {
      add(port.code, { kind: "code-format", message: `UN/LOCODEs are 5 characters: a 2-letter country and 3 letters or digits. “${port.code}” is not.` });
    }
    if (iso && port.code.length >= 2 && !port.code.startsWith(iso)) {
      add(port.code, { kind: "code-country", message: `${port.country} codes start with ${iso}, this one starts with ${port.code.slice(0, 2)}.` });
    }
    if (!iso) add(port.code, { kind: "country", message: `“${port.country}” is not a recognised country name, so the flag and code checks are skipped.` });
    if ((codes.get(port.code) ?? 0) > 1) add(port.code, { kind: "duplicate-code", message: `${codes.get(port.code)} ports share the code ${port.code}.` });
    const twins = names.get(`${port.country.toLowerCase()}|${port.name.toLowerCase()}`) ?? [];
    if (twins.length > 1) add(port.code, { kind: "duplicate-name", message: `Same name and country as ${twins.filter((code) => code !== port.code).join(", ")}.` });
    const location = locationProblem(port);
    if (location === "coordinates") add(port.code, { kind: "coordinates", message: "Latitude and longitude are missing or out of range." });
    if (location === "region") add(port.code, { kind: "region-location", message: `The coordinates sit outside ${port.region}. Check the region or the coordinates.` });
  }
  return issues;
}
