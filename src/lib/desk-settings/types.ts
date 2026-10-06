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
    { tag: "first_name", label: "First name", sample: "Amara" },
    { tag: "user_name", label: "Member name", sample: "Amara Okafor" },
    { tag: "user_email", label: "Member email", sample: "amara@harvestco.com" },
    { tag: "user_company", label: "Company", sample: "Harvest Co" },
    { tag: "product", label: "Product", sample: "Urea - Granular" },
    { tag: "qty", label: "Quantity (MT)", sample: "25000" },
    { tag: "destination", label: "Destination", sample: "Lagos" },
    { tag: "ship_from", label: "Ship from", sample: "2026-11-01" },
    { tag: "ship_to", label: "Ship to", sample: "2026-11-30" },
    { tag: "reference", label: "Reference", sample: "AQ-R-7K2M9Q" },
  ],
  zero: [
    { tag: "first_name", label: "First name", sample: "Amara" },
    { tag: "user_name", label: "Member name", sample: "Amara Okafor" },
    { tag: "user_email", label: "Member email", sample: "amara@harvestco.com" },
    { tag: "user_company", label: "Company", sample: "Harvest Co" },
    { tag: "programme", label: "Programme", sample: "AQ Zero Harvest" },
    { tag: "request", label: "Waitlist or call", sample: "Book a call for early discounted access" },
    { tag: "next_step", label: "What happens next", sample: "The desk will email you to confirm a call time." },
    { tag: "annual_volume", label: "Annual volume (MT)", sample: "5000" },
    { tag: "primary_product", label: "Primary product", sample: "Urea (Prilled / Granular)" },
  ],
};

export const FORM_DETAILS = "[form-details]";

export const DEFAULT_DESK_SETTINGS: DeskSettings = {
  orderDesk: {
    recipient: "noreply@aquifert.com",
    success: "Your enquiry has been sent to the Aquifert trading desk.",
    sendApplicant: true,
    sendAdmin: true,
    applicant: {
      subject: "Your requirement is with the Aquifert trade desk — {product}",
      body: "# Your requirement is with the desk, {first_name}\n\nThank you for submitting your trading requirement. A member of the Aquifert trade desk is reviewing the details now and will come back to you with pricing and availability.\n\n[form-details]\n\n## What happens next\n1. The desk reviews your requirement against current supplier availability.\n2. We come back to you with pricing tailored to your quality, quantity, packing and destination.\n3. Nothing moves without your approval. The engine flags, a human clears.\n\nNeed to change anything? Reply to this email quoting your reference **{reference}** and the desk will pick it up.",
    },
    admin: {
      subject: "New enquiry — {product} — {qty} MT — {user_company}",
      body: "# New enquiry: {product}\n\n{user_name} ({user_email}) · {user_company}\nReference **{reference}**\n\n[form-details]",
    },
  },
  zero: {
    showOnHub: true,
    recipient: "noreply@aquifert.com",
    success: "You're registered. A confirmation email is on its way.",
    sendApplicant: true,
    sendAdmin: true,
    applicant: {
      subject: "You are on the list for {programme}",
      body: "# You are on the list, {first_name}\n\nThank you for registering your interest in **{programme}**, supplier-cost buying with a fixed operations fee. Product at cost, pass-through freight and a stated fee, with a full document trail on every tonne.\n\n## What happens next\n1. Your place in the pilot queue is held. Nothing else is needed from you today.\n2. {next_step}\n3. We will confirm pricing and availability with you before your first trade.\n\nQuestions in the meantime? Reply to this email or write to the desk. We read everything.",
    },
    admin: {
      subject: "Aquifert Zero: {request} — {user_company}",
      body: "# New Aquifert Zero registration\n\n{request}\n{user_name} ({user_email}) · {user_company}\n\n[form-details]",
    },
  },
  members: { requireWorkEmail: true, blocked: [], allowed: [] },
  delivery: { fromName: "Aquifert", replyTo: "noreply@aquifert.com" },
  updatedAt: null,
};

/** Desk addresses no longer in use; a saved copy is replaced with the current default. */
export const RETIRED_ADDRESSES = ["sales@aquifert.com"];

/** Earlier built-in templates; a saved copy still matching one of these is upgraded to the current default. */
export const RETIRED_TEMPLATES: Record<TemplateKind, Record<"applicant" | "admin", EmailTemplate[]>> = {
  order: {
    applicant: [
      {
        subject: "Your Aquifert enquiry has been received — {product}",
        body: "Hi {user_name},\n\nThank you for your enquiry. Here is a summary of what you submitted. Our trading desk will review your requirements and get back to you shortly.\n\n[form-details]\n\nBest regards,\n**Aquifert Trading Team**",
      },
    ],
    admin: [{ subject: "New enquiry — {product} — {qty} MT — {user_company}", body: "**New enquiry received**\n{user_name} ({user_email}) · {user_company}\n\n[form-details]" }],
  },
  zero: {
    applicant: [
      {
        subject: "You're registered for Aquifert Zero",
        body: "Hi {user_name},\n\nThank you for registering {user_company} for {programme}.\n\n{next_step}\n\n[form-details]\n\nThis is an automated message from a no-reply address. To reach the team, write to sales@aquifert.com.\n\nBest regards,\n**Aquifert Team**",
      },
    ],
    admin: [{ subject: "Aquifert Zero: {request} — {user_company}", body: "**New Aquifert Zero registration**\n{request}\n\n[form-details]" }],
  },
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
