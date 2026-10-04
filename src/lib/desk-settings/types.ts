export type EmailTemplate = { subject: string; body: string };

export type FormEmails = {
  recipient: string;
  success: string;
  sendApplicant: boolean;
  sendAdmin: boolean;
  applicant: EmailTemplate;
  admin: EmailTemplate;
};

export type ZeroEmails = FormEmails & { showOnHub: boolean };

export type MemberRules = {
  requireWorkEmail: boolean;
  /** Extra domains or full addresses refused at sign-up. */
  blocked: string[];
  /** Domains or full addresses that pass even when they are on a freemail or blocked list. */
  allowed: string[];
};

export type DeliverySettings = { fromName: string; replyTo: string };

export type DeskSettings = {
  orderDesk: FormEmails;
  zero: ZeroEmails;
  members: MemberRules;
  delivery: DeliverySettings;
  updatedAt: string | null;
};

export type TemplateKind = "order" | "zero";

export type TemplateTag = { tag: string; label: string; sample: string };

export const TEMPLATE_TAGS: Record<TemplateKind, TemplateTag[]> = {
  order: [
    { tag: "user_name", label: "Member name", sample: "Amara Okafor" },
    { tag: "user_email", label: "Member email", sample: "amara@harvestco.com" },
    { tag: "user_company", label: "Company", sample: "Harvest Co" },
    { tag: "product", label: "Product", sample: "Urea - Granular" },
    { tag: "qty", label: "Quantity (MT)", sample: "25000" },
    { tag: "destination", label: "Destination", sample: "Lagos" },
    { tag: "ship_from", label: "Ship from", sample: "2026-11-01" },
    { tag: "ship_to", label: "Ship to", sample: "2026-11-30" },
  ],
  zero: [
    { tag: "user_name", label: "Member name", sample: "Amara Okafor" },
    { tag: "user_email", label: "Member email", sample: "amara@harvestco.com" },
    { tag: "user_company", label: "Company", sample: "Harvest Co" },
    { tag: "programme", label: "Programme", sample: "AQ Zero Harvest" },
    { tag: "annual_volume", label: "Annual volume (MT)", sample: "5000" },
    { tag: "primary_product", label: "Primary product", sample: "Urea (Prilled / Granular)" },
  ],
};

export const FORM_DETAILS = "[form-details]";

export const DEFAULT_DESK_SETTINGS: DeskSettings = {
  orderDesk: {
    recipient: "sales@aquifert.com",
    success: "Your enquiry has been sent to the Aquifert trading desk.",
    sendApplicant: true,
    sendAdmin: true,
    applicant: {
      subject: "Your Aquifert enquiry has been received — {product}",
      body: "Hi {user_name},\n\nThank you for your enquiry. Here is a summary of what you submitted. Our trading desk will review your requirements and get back to you shortly.\n\n[form-details]\n\nBest regards,\n**Aquifert Trading Team**",
    },
    admin: {
      subject: "New enquiry — {product} — {qty} MT — {user_company}",
      body: "**New enquiry received**\n{user_name} ({user_email}) · {user_company}\n\n[form-details]",
    },
  },
  zero: {
    showOnHub: true,
    recipient: "sales@aquifert.com",
    success: "Interest registered. The Aquifert team will be in touch within two business days.",
    sendApplicant: true,
    sendAdmin: true,
    applicant: {
      subject: "Your Aquifert Zero interest has been registered",
      body: "Hi {user_name},\n\nThank you for registering your interest in Aquifert Zero.\n\n[form-details]\n\nBest regards,\n**Aquifert Team**",
    },
    admin: {
      subject: "New Aquifert Zero interest — {user_company}",
      body: "**New Aquifert Zero interest received**\n\n[form-details]",
    },
  },
  members: { requireWorkEmail: true, blocked: [], allowed: [] },
  delivery: { fromName: "Aquifert", replyTo: "sales@aquifert.com" },
  updatedAt: null,
};

export const ZERO_PRODUCTS = [
  "Urea (Prilled / Granular)",
  "DAP / MAP",
  "MOP / SOP",
  "Amsul (Ammonium Sulphate)",
  "WSF Specialities",
  "NPK Compound",
  "Multiple / TBD",
] as const;
