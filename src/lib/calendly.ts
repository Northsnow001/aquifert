export const CALENDLY_URL = "https://calendly.com/aquifert";
export const CALENDLY_ORIGIN = "https://calendly.com";

/** Calendly only posts booking events to the parent page when `embed_domain` is set. */
export function calendlyLink(options: { name?: string; email?: string; campaign?: string; content?: string; embedDomain?: string } = {}) {
  const params = new URLSearchParams({ hide_gdpr_banner: "1" });
  if (options.name) params.set("name", options.name);
  if (options.email) params.set("email", options.email);
  if (options.campaign) params.set("utm_campaign", options.campaign);
  if (options.content) params.set("utm_content", options.content);
  if (options.embedDomain) {
    params.set("embed_domain", options.embedDomain);
    params.set("embed_type", "Inline");
  }
  return `${CALENDLY_URL}?${params}`;
}

export const isCalendlyInvitee = (value: unknown): value is string =>
  typeof value === "string" && /^https:\/\/api\.calendly\.com\/scheduled_events\/[\w-]+\/invitees\/[\w-]+$/.test(value);
