/**
 * Cross-document numeric & data consistency engine (spine §8.5).
 *
 * Distinct from identity: a trade's documents must AGREE with each other.
 * Extracts key commercial fields from every document body and flags
 * disagreements (price, quantity, weight, contract reference, spec) for a
 * human, these cause payment disputes even when no identity leaks.
 */

export interface DocForCheck {
  id: number;
  name: string;
  text: string;
}

export interface FieldValue {
  docId: number;
  docName: string;
  value: string;
}

export interface ConsistencyFlag {
  field: "UNIT_PRICE" | "QUANTITY" | "WEIGHT" | "CONTRACT_REF" | "SPEC";
  values: FieldValue[];
  message: string;
}

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function extract(text: string) {
  const unitPrices = uniq(
    [...text.matchAll(/(?:USD|GBP|£|\$)\s?(\d+(?:\.\d+)?)\s*(?:\/?\s?(?:MT|mt|per\s*mt|\/tonne))/gi)].map((m) => m[1]),
  );
  const quantities = uniq(
    [...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:MT|metric\s*tonnes?|tons?)\b/gi)].map((m) => m[1]),
  );
  const weights = uniq(
    [...text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(?:kg|kgs|kilograms?)\b/gi)].map((m) => m[1].replace(/,/g, "")),
  );
  const contractRefs = uniq([...text.matchAll(/\bAQ-[A-Z0-9-]{4,}\b/g)].map((m) => m[0]));
  const specs = uniq([...text.matchAll(/\bFe\s?\d+(?:\.\d+)?\s?%\s*(?:min)?/gi)].map((m) => m[0].replace(/\s+/g, " ")));
  return { unitPrices, quantities, weights, contractRefs, specs };
}

const LABELS: Record<ConsistencyFlag["field"], string> = {
  UNIT_PRICE: "Unit price",
  QUANTITY: "Quantity",
  WEIGHT: "Weight",
  CONTRACT_REF: "Contract reference",
  SPEC: "Product specification",
};

/** Compare the same field across every document of a trade. */
export function crossCheckDocuments(docs: DocForCheck[]): ConsistencyFlag[] {
  const flags: ConsistencyFlag[] = [];
  const fields = ["unitPrices", "quantities", "weights", "contractRefs", "specs"] as const;
  const fieldMap: Record<(typeof fields)[number], ConsistencyFlag["field"]> = {
    unitPrices: "UNIT_PRICE",
    quantities: "QUANTITY",
    weights: "WEIGHT",
    contractRefs: "CONTRACT_REF",
    specs: "SPEC",
  };

  for (const f of fields) {
    const byValue = new Map<string, FieldValue[]>();
    for (const d of docs) {
      for (const v of extract(d.text)[f]) {
        const arr = byValue.get(v) ?? [];
        arr.push({ docId: d.id, docName: d.name, value: v });
        byValue.set(v, arr);
      }
    }
    if (byValue.size > 1) {
      const field = fieldMap[f];
      const values = [...byValue.values()].flat();
      const distinct = [...byValue.keys()];
      flags.push({
        field,
        values,
        message: `${LABELS[field]} disagrees across the pack: ${distinct.join(" vs ")}, reconcile before release (cf. proforma billing more than the loaded quantity, or two unit prices on the same trade).`,
      });
    }
  }
  return flags;
}
