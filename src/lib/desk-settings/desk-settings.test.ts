import assert from "node:assert/strict";
import test from "node:test";
import { DISPOSABLE_MESSAGE, WORK_EMAIL_MESSAGE, checkSignupEmail, cleanEntries } from "./email-rules";
import { renderEmail } from "./render";
import { DEFAULT_DESK_SETTINGS } from "./types";

const rules = { requireWorkEmail: true, blocked: [], allowed: [] };

test("work addresses pass and freemail is refused while work email is required", () => {
  assert.deepEqual(checkSignupEmail("Buyer@HarvestCo.com", rules), { ok: true, rule: "work" });
  assert.deepEqual(checkSignupEmail("someone@gmail.com", rules), { ok: false, reason: "freemail", message: WORK_EMAIL_MESSAGE });
  assert.deepEqual(checkSignupEmail("someone@gmail.com", { ...rules, requireWorkEmail: false }), { ok: true, rule: "freemail-permitted" });
});

test("disposable domains and their subdomains are always refused", () => {
  const relaxed = { ...rules, requireWorkEmail: false };
  assert.equal(checkSignupEmail("x@mailinator.com", relaxed).ok, false);
  assert.deepEqual(checkSignupEmail("x@inbox.mailinator.com", relaxed), { ok: false, reason: "disposable", message: DISPOSABLE_MESSAGE });
});

test("banned addresses get the disposable message so the ban stays hidden", () => {
  const verdict = checkSignupEmail("gone@harvestco.com", rules, (email) => email === "gone@harvestco.com");
  assert.deepEqual(verdict, { ok: false, reason: "banned", message: DISPOSABLE_MESSAGE });
});

test("the allow list overrides freemail and the block list, but never a ban", () => {
  const custom = { requireWorkEmail: true, blocked: ["rival.com", "one@partner.com"], allowed: ["vip@gmail.com", "partner.com"] };
  assert.deepEqual(checkSignupEmail("vip@gmail.com", custom), { ok: true, rule: "allowed" });
  assert.equal(checkSignupEmail("other@gmail.com", custom).ok, false);
  assert.equal(checkSignupEmail("sales@rival.com", custom).ok, false);
  assert.deepEqual(checkSignupEmail("one@partner.com", custom), { ok: true, rule: "allowed" });
  assert.equal(checkSignupEmail("vip@gmail.com", custom, () => true).ok, false);
  assert.equal(checkSignupEmail("not-an-email", custom).ok, false);
});

test("list entries are cleaned to lower-case domains and addresses", () => {
  assert.deepEqual(cleanEntries([" @Rival.com ", "VIP@gmail.com", "nonsense", "", "rival.com"]), ["rival.com", "vip@gmail.com"]);
});

test("templates fill tags, escape member input and place the details table", () => {
  const email = renderEmail({
    template: DEFAULT_DESK_SETTINGS.orderDesk.applicant,
    vars: { user_name: "Amara <script>", product: "Urea - Granular" },
    sections: [{ title: "Product details", rows: [["Product", "Urea - Granular"], ["Grade", ""]] }],
    year: 2026,
  });
  assert.equal(email.subject, "Your Aquifert enquiry has been received — Urea - Granular");
  assert.ok(email.html.includes("Hi Amara &lt;script&gt;,"));
  assert.ok(!email.html.includes("<script>"));
  assert.ok(email.html.includes("Product details"));
  assert.ok(!email.html.includes(">Grade<"));
  assert.ok(email.html.includes('<strong style="color:#111827;">Aquifert Trading Team</strong>'));
  assert.ok(email.text.includes("PRODUCT DETAILS\nProduct: Urea - Granular"));
  assert.ok(email.html.indexOf("Thank you") < email.html.indexOf("Product details"));
  assert.ok(email.html.indexOf("Product details") < email.html.indexOf("Best regards"));
});

test("unknown tags are reported and left visible", () => {
  const email = renderEmail({ template: { subject: "Hi {user_name} {typo}", body: "Ref {typo}" }, vars: { user_name: "Ola" }, sections: [] });
  assert.equal(email.subject, "Hi Ola {typo}");
  assert.deepEqual(email.unknownTags, ["typo"]);
  assert.ok(email.html.includes("Ref {typo}"));
});

test("empty tags do not leave dangling separators in the subject", () => {
  const template = { subject: "New enquiry — {product} — {qty} MT — {user_company}", body: "b" };
  const subject = (vars: Record<string, string>) => renderEmail({ template, vars, sections: [] }).subject;
  assert.equal(subject({ product: "Urea - Granular", qty: "5000", user_company: "" }), "New enquiry — Urea - Granular — 5000 MT");
  assert.equal(subject({ product: "", qty: "5000", user_company: "Harvest Co" }), "New enquiry — 5000 MT — Harvest Co");
  assert.equal(renderEmail({ template: { subject: "{a} · Desk | {b}", body: "b" }, vars: { a: "", b: "Zero" }, sections: [] }).subject, "Desk | Zero");
});

test("an action button is appended when given", () => {
  const email = renderEmail({ template: { subject: "s", body: "b" }, vars: {}, sections: [], action: { label: "Open in admin", href: "https://example.com/admin?a=1&b=2" } });
  assert.ok(email.html.includes('href="https://example.com/admin?a=1&amp;b=2"'));
  assert.ok(email.text.endsWith("Open in admin: https://example.com/admin?a=1&b=2"));
});
