export function parseJsonObject(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in model output.");
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

export function asString(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export function asBool(value: unknown) {
  return value === true || value === "true";
}
