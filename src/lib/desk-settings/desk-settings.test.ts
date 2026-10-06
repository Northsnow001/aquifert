import assert from "node:assert/strict";
import test from "node:test";
import { DISPOSABLE_MESSAGE, WORK_EMAIL_MESSAGE, checkSignupEmail, cleanEntries } from "./email-rules";
import { ZERO, toRow } from "../data/tables";
import { ZERO_INTENT_LABEL, ZERO_NEXT_STEP } from "../zero-types";
import { ORDER_SAMPLE, ZERO_SAMPLE, formEmail, orderEmailData, zeroEmailData } from "./forms";
import { renderEmail } from "./render";
import { DEFAULT_DESK_SETTINGS, RETIRED_TEMPLATES } from "./types";
import { analyticsWaitlistEmail, contactReceiptEmail, splitTopic, supabaseAuthTemplates } from "../email/templates";

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

test("templates fill tags, escape member input and place the details card", () => {
  const email = renderEmail({
    template: DEFAULT_DESK_SETTINGS.orderDesk.applicant,
    vars: { first_name: "Amara <script>", product: "Urea - Granular", reference: "AQ-R-1" },
    sections: [{ title: "Product details", rows: [["Product", "Urea - Granular"], ["Grade", ""]] }],
  });
  assert.equal(email.subject, "Your requirement is with the Aquifert trade desk — Urea - Granular");
  assert.ok(email.html.includes("Your requirement is with the desk, Amara &lt;script&gt;"));
  assert.ok(!email.html.includes("<script>"));
  assert.ok(email.html.includes("Product details"));
  assert.ok(!email.html.includes(">Grade<"));
  assert.ok(email.html.includes("/storage/v1/object/public/logo/logo-v2.png"));
  assert.ok(email.html.includes("Matt &amp; Phil"));
  assert.ok(email.text.includes("PRODUCT DETAILS\nProduct: Urea - Granular"));
  assert.ok(email.text.includes("WHAT HAPPENS NEXT\n1. The desk reviews your requirement"));
  assert.ok(email.html.indexOf("Thank you for submitting") < email.html.indexOf("Product details"));
  assert.ok(email.html.indexOf("Product details") < email.html.indexOf("What happens next"));
});

test("Trading Desk confirmation quotes the reference and links back to the desk", () => {
  const email = formEmail({ kind: "order", audience: "applicant", template: DEFAULT_DESK_SETTINGS.orderDesk.applicant, data: orderEmailData(ORDER_SAMPLE), deskEmail: "desk@aquifert.com", adminHref: "/admin/enquiries" });
  assert.deepEqual(email.unknownTags, []);
  assert.ok(email.text.includes("Reference: AQ-R-7K2M9Q"));
  assert.ok(email.text.includes("Volume: 25,000 MT"));
  assert.ok(!email.text.includes("Prepayment"));
  assert.ok(email.html.includes("mailto:desk@aquifert.com?subject=Requirement%20AQ-R-7K2M9Q"));
  assert.ok(email.html.indexOf("Add detail to this requirement") < email.html.indexOf("Need to change anything?"));

  const desk = formEmail({ kind: "order", audience: "admin", template: DEFAULT_DESK_SETTINGS.orderDesk.admin, data: orderEmailData(ORDER_SAMPLE), adminHref: "https://x.test/admin/enquiries" });
  assert.ok(desk.text.includes("Prepayment: 20%"));
  assert.ok(desk.text.includes("Open in admin: https://x.test/admin/enquiries"));
  assert.ok(!desk.html.includes("Matt &amp; Phil"));
});

test("saved templates that still match an old default are not mistaken for custom ones", () => {
  const old = RETIRED_TEMPLATES.order.applicant[0];
  assert.ok(old.body.includes("Best regards"));
  assert.notEqual(old.body, DEFAULT_DESK_SETTINGS.orderDesk.applicant.body);
  const legacy = renderEmail({ template: old, vars: { user_name: "Ola", product: "DAP" }, sections: [] });
  assert.ok(!legacy.html.includes("Matt &amp; Phil"), "a template with its own sign-off skips the shared signature");
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

test("the Zero confirmation says what happens next for waitlist and call requests", () => {
  const call = { ...ZERO_SAMPLE, request: ZERO_INTENT_LABEL.call, nextStep: ZERO_NEXT_STEP.call };
  const waitlist = { ...ZERO_SAMPLE, request: ZERO_INTENT_LABEL.waitlist, nextStep: ZERO_NEXT_STEP.waitlist, phone: "", callDate: "", callWindow: "", timezone: "" };
  const render = (zero: typeof call) => formEmail({ kind: "zero", audience: "applicant", template: DEFAULT_DESK_SETTINGS.zero.applicant, data: zeroEmailData(zero), adminHref: "/admin/zero" });

  const callEmail = render(call);
  assert.ok(callEmail.text.includes(`2. ${ZERO_NEXT_STEP.call}`));
  assert.ok(callEmail.text.startsWith("AQ ZERO · CALL REQUEST RECEIVED"));
  assert.deepEqual(callEmail.unknownTags, []);

  const waitlistEmail = render(waitlist);
  assert.equal(waitlistEmail.subject, "You are on the list for AQ Zero Harvest");
  assert.ok(waitlistEmail.text.startsWith("AQ ZERO · WAITLIST CONFIRMED\n\nYou are on the list, Amara"));
  assert.ok(waitlistEmail.text.includes("We will get back to you as soon as Aquifert Zero is live."));
  assert.ok(waitlistEmail.html.includes("mailto:noreply@aquifert.com?subject=AQ%20Zero%20question"));
  assert.ok(!waitlistEmail.text.includes("Phone:"));

  const desk = formEmail({ kind: "zero", audience: "admin", template: DEFAULT_DESK_SETTINGS.zero.admin, data: zeroEmailData(call), adminHref: "/admin/zero" });
  assert.ok(desk.text.includes("Preferred call day: Tuesday, 6 October 2026"));
});

test("the AQ Analytics waitlist and contact receipt use the shared design", () => {
  const analytics = analyticsWaitlistEmail({ name: "Amara Okafor", deskEmail: "desk@aquifert.com" });
  assert.equal(analytics.subject, "You are on the AQ Analytics waitlist");
  assert.ok(analytics.html.includes("You are on the list, Amara"));
  assert.ok(analytics.html.includes("mailto:desk@aquifert.com?subject=AQ%20Analytics%20question"));

  const parsed = splitTopic("About: Weekly Market Call\n\nWhen is the next one?");
  assert.deepEqual(parsed, { topic: "Weekly Market Call", body: "When is the next one?" });
  assert.deepEqual(splitTopic("Hello there"), { topic: "General enquiry", body: "Hello there" });
  const receipt = contactReceiptEmail({ name: "Ola <b>", reference: "AQ-C-1", topic: parsed.topic, message: parsed.body });
  assert.equal(receipt.subject, "We have received your message — AQ-C-1");
  assert.ok(receipt.html.includes("Thank you, Ola"));
  assert.ok(!receipt.html.includes("<b>"));
  assert.ok(receipt.text.includes("Topic: Weekly Market Call"));
});

test("Supabase auth templates keep Supabase placeholders intact", () => {
  const { verification, reset } = supabaseAuthTemplates();
  assert.ok(verification.html.includes("{{ .Token }}"));
  assert.ok(verification.html.includes("Hello{{ if .Data.name }} {{ .Data.name }}{{ end }},"));
  assert.ok(reset.html.includes('href="{{ .ConfirmationURL }}"'));
  assert.ok(!reset.html.includes("{{FIRST_NAME}}"));
});

test("waitlist rows fill the Supabase columns, treating older registrations as waitlist sign-ups", () => {
  const base = { id: "zero-1", at: "2026-10-04T10:00:00.000Z", userId: "u1", name: "Ola", email: "Ola@Example.com", company: "Harvest Co", annualVolume: "5000", product: "DAP / MAP", notes: "", status: "new" as const, adminNote: "", updatedAt: null };
  const old = toRow(ZERO, base);
  assert.equal(old.intent, "waitlist");
  assert.equal(old.company, "Harvest Co");
  assert.equal(old.email, "ola@example.com");
  assert.equal(old.call_date, null);

  const call = toRow(ZERO, { ...base, intent: "call", callDate: "2026-10-06", callWindow: "Morning (09:00–12:00)", phone: "+234 801", status: "scheduled" });
  assert.equal(call.intent, "call");
  assert.equal(call.call_date, "2026-10-06");
  assert.equal(call.status, "scheduled");
  assert.equal(call.id, "zero-1");
});

test("an action button is appended when given", () => {
  const email = renderEmail({ template: { subject: "s", body: "b" }, vars: {}, sections: [], action: { label: "Open in admin", href: "https://example.com/admin?a=1&b=2" } });
  assert.ok(email.html.includes('href="https://example.com/admin?a=1&amp;b=2"'));
  assert.ok(email.text.includes("b\n\nOpen in admin: https://example.com/admin?a=1&b=2"));
});
