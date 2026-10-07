import { brandedHtml, brandedText, DESK_EMAIL, escapeHtml, firstName, inline, SITE_URL, type BrandedEmail } from "@/lib/email/brand";

export type ComposedEmail = { subject: string; html: string; text: string };

const compose = (subject: string, email: BrandedEmail): ComposedEmail => ({ subject, html: brandedHtml(email), text: brandedText(email) });

const mailto = (desk: string, subject: string) => `mailto:${desk}?subject=${encodeURIComponent(subject)}`;

export function analyticsWaitlistEmail(input: { name: string; deskEmail?: string }): ComposedEmail {
  const desk = input.deskEmail?.trim() || DESK_EMAIL;
  const first = firstName(input.name);
  return compose("You are on the AQ Analytics waitlist", {
    title: "You are on the AQ Analytics waitlist",
    preheader: "Thank you for joining the AQ Analytics waitlist. The trade desk will be in touch when we are live.",
    tagline: "Advisory for the Global Market",
    eyebrow: "AQ Analytics · Waitlist confirmed",
    heading: first ? `You are on the list, ${first}` : "You are on the list",
    blocks: [
      {
        kind: "text",
        html: inline(
          "Thank you for registering your interest in **AQ Analytics**, trader-level market analysis for the fertiliser market. PRA data, trade flows, port lineups, freight benchmarks and the daily brief, with no physical trading.",
        ),
      },
      {
        kind: "steps",
        title: "What happens next",
        items: [
          "Your place is held. Nothing else is needed from you today.",
          "The trade desk will come back to you when AQ Analytics is live.",
          "We will walk you through the modules and confirm pricing before anything is billed.",
        ].map(inline),
      },
      { kind: "button", label: "Talk to the trade desk", href: mailto(desk, "AQ Analytics question") },
      { kind: "note", html: inline("Questions in the meantime? Reply to this email or write to the desk. We read everything.") },
    ],
    footerNote: "You received this email because you joined the AQ Analytics waitlist.",
    deskEmail: desk,
  });
}

const SUPABASE_GREETING = "Hello{{ if .Data.name }} {{ .Data.name }}{{ end }}";

/** Goes straight to our reset page; the token is only redeemed when the new password is saved. */
const RESET_LINK = "{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery";

/**
 * Supabase Auth sends sign-in codes and password resets itself, so these are pasted into Supabase
 * (Authentication → Email Templates). Placeholders use Supabase's {{ .Token }} / {{ .TokenHash }} syntax;
 * {{ .SiteURL }} is the Site URL under Authentication → URL Configuration.
 */
export function supabaseAuthTemplates() {
  const verification = compose("Your Aquifert verification code", {
    title: "Your Aquifert verification code",
    preheader: "Your Aquifert verification code is inside. It expires in about an hour.",
    tagline: "Transparent Global Fertiliser Access",
    eyebrow: "Security check",
    heading: "Confirm your email address",
    blocks: [
      {
        kind: "text",
        html: inline(
          `${SUPABASE_GREETING}, use the code below to confirm your email and continue to Aquifert ONE. Enter it on the verification screen in your browser. There is no link to click.`,
        ),
      },
      { kind: "code", label: "Verification code", code: "{{ .Token }}" },
      {
        kind: "note",
        html: inline(
          "The code expires in **about an hour**. If you did not request it, you can ignore this email. Never share this code with anyone, including Aquifert staff.\nSent to {{ .Email }}",
        ),
      },
    ],
    footerNote: "This is an automated security message. Please do not reply.",
  });
  const reset = compose("Reset your Aquifert password", {
    title: "Reset your Aquifert password",
    preheader: "A link to reset your Aquifert password is inside. It expires in about an hour.",
    tagline: "Transparent Global Fertiliser Access",
    eyebrow: "Account recovery",
    heading: "Reset your password",
    blocks: [
      {
        kind: "text",
        html: inline(
          `${SUPABASE_GREETING}, we received a request to reset the password on your Aquifert ONE account. Choose a new password using the button below. The link is valid for **about an hour**.`,
        ),
      },
      { kind: "button", label: "Reset my password", href: RESET_LINK, tone: "teal" },
      {
        kind: "note",
        html: `Button not working? Paste this link into your browser:<br><a href="${escapeHtml(RESET_LINK)}" style="color:#31648F; word-break:break-all;">${escapeHtml(RESET_LINK)}</a>`,
      },
      {
        kind: "callout",
        html: inline("If you did not ask for a reset, your password is unchanged and you can ignore this email. Consider signing in and changing your password as a precaution."),
      },
      { kind: "note", html: "Sent to {{ .Email }}" },
    ],
    footerNote: "This is an automated security message. Please do not reply.",
  });
  return { verification, reset };
}

/** Messages arrive as "About: Topic" followed by a blank line when sent from a topic link. */
export function splitTopic(message: string, fallback = "General enquiry") {
  const match = message.match(/^About:\s*(.+?)\n\n([\s\S]*)$/);
  return match ? { topic: match[1].trim(), body: match[2].trim() } : { topic: fallback, body: message.trim() };
}

export function contactReceiptEmail(input: { name: string; reference: string; topic: string; message: string; deskEmail?: string }): ComposedEmail {
  const first = firstName(input.name);
  const snippet = input.message.replace(/\s+/g, " ").trim();
  return compose(`We have received your message — ${input.reference}`, {
    title: "We have received your message",
    preheader: "Thank you for contacting Aquifert. Your message is with the team and we will reply shortly.",
    tagline: "Transparent Global Fertiliser Access",
    eyebrow: "Message received",
    heading: first ? `Thank you, ${first}` : "Thank you",
    blocks: [
      {
        kind: "text",
        html: inline("Your message has landed with the Aquifert team. We reply to every enquiry personally, and you can expect to hear from us within **one working day**."),
      },
      {
        kind: "details",
        title: "Your enquiry",
        sections: [
          {
            title: "Your enquiry",
            rows: [
              ["Reference", input.reference],
              ["Topic", input.topic],
              ["Message", snippet.length > 280 ? `${snippet.slice(0, 277).trimEnd()}…` : snippet],
            ],
          },
        ],
      },
      { kind: "button", label: "Explore Aquifert ONE", href: SITE_URL, tone: "teal" },
      { kind: "note", html: inline("While you wait, the AQ ONE Hub is free to explore: daily market news, expert trader commentary and the Nitrogen Report tool.") },
    ],
    footerNote: "You received this email because you sent us a message through the Aquifert contact form.",
    deskEmail: input.deskEmail,
  });
}
