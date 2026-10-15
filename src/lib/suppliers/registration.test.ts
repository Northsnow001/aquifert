import assert from "node:assert/strict";
import test from "node:test";
import { normaliseSupplierCode, parseSupplierRegistration } from "./registration";

const now = new Date("2026-10-15T12:00:00Z");
const valid = {
  code: " sup-002 ",
  email: "Sales@Example.com ",
  company: "  North  Fertiliser Co ",
  country: "China",
  contact: "Sales desk",
  products: ["Urea (granular)", "CAN", "CAN", "Caviar"],
  load_ports: "Qingdao,  Lianyungang",
  channel: "wechat",
  consent: true,
};

test("a complete registration becomes one sheet row", () => {
  const result = parseSupplierRegistration(valid, now);
  assert.ok(result.ok);
  assert.deepEqual(result.value, {
    code: "SUP-002",
    company: "North Fertiliser Co",
    country: "China",
    contact: "Sales desk",
    email: "sales@example.com",
    products: "Urea (granular), CAN",
    load_ports: "Qingdao, Lianyungang",
    channel: "wechat",
    status: "form_done",
    form_submitted_at: "2026-10-15T12:00:00.000Z",
  });
});

test("supplier codes are matched however they are typed", () => {
  assert.equal(normaliseSupplierCode("sup 002"), "SUP002");
  assert.equal(normaliseSupplierCode(" Sup-003\n"), "SUP-003");
  assert.equal(normaliseSupplierCode(42), "");
});

test("the supplier code is optional and a malformed one is dropped", () => {
  for (const code of [undefined, "", "SUP/002"]) {
    const result = parseSupplierRegistration({ ...valid, code }, now);
    assert.ok(result.ok, String(code));
    assert.equal(result.value.code, "");
  }
});

test("missing or invalid answers are refused with a reason", () => {
  const cases: [Record<string, unknown>, RegExp][] = [
    [{ ...valid, email: "not-an-email" }, /email/],
    [{ ...valid, company: " " }, /company/],
    [{ ...valid, products: ["Caviar"] }, /product/],
    [{ ...valid, products: "Urea (granular)" }, /product/],
    [{ ...valid, load_ports: "" }, /load port/],
    [{ ...valid, channel: "whatsapp" }, /WeChat or email/],
    [{ ...valid, consent: "yes" }, /agree/],
  ];
  for (const [body, reason] of cases) {
    const result = parseSupplierRegistration(body, now);
    assert.equal(result.ok, false, JSON.stringify(body));
    if (!result.ok) assert.match(result.error, reason);
  }
});
