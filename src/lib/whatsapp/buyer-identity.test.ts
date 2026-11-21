import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { identityFromParts } from "@/lib/whatsapp/buyer-identity";

describe("identityFromParts", () => {
  test("lists every blank required field", () => {
    const fields = identityFromParts({
      name: "",
      jobTitle: "",
      company: "",
      email: "",
      country: "",
      address: "",
      buyerType: "",
      phone: "+234000",
    });
    assert.equal(fields.missing.length, 7);
  });

  test("is complete when all seven are present", () => {
    const fields = identityFromParts({
      name: "Kayode",
      jobTitle: "Director",
      company: "Nexora",
      email: "kaytoba49@gmail.com",
      country: "Nigeria",
      address: "Lagos",
      buyerType: "importer",
      phone: "+2349022834241",
    });
    assert.equal(fields.buyerType, "Importer");
    assert.deepEqual(fields.missing, []);
  });
});
