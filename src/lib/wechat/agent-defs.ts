import {
  WORKFLOW_BUYER_ONBOARD_PROMPT,
  WORKFLOW_BUYER_RFQ_PROMPT,
  WORKFLOW_MATT_PROMPT,
  WORKFLOW_UNKNOWN_SUPPLIER_PROMPT,
} from "@/lib/wechat/workflow-prompts";

export const TRADE_AGENTS = {
  "wechat-supplier-quote": {
    name: "Matt — supplier quotes",
    description: "Known suppliers on WeChat. Greets, collects Trade ID, extracts offers, one follow-up then close.",
  },
  "wechat-supplier-unknown": {
    name: "Supplier desk — not on list",
    description: "OpenID is not on trade_suppliers. Collects company, contact name and email, then registers them.",
  },
  "whatsapp-buyer-onboard": {
    name: "Buyer desk — not on list",
    description: "WhatsApp numbers not on trade_buyers. Collects the seven identity fields from workflow 6, then registers them.",
  },
  "whatsapp-buyer-complete": {
    name: "Buyer desk — invited, file incomplete",
    description: "Invited buyers already on the book. Only asks for identity fields that are still blank, then writes them to Buyers.",
  },
  "whatsapp-buyer-desk": {
    name: "AQ Buyer Desk — WhatsApp",
    description: "Verified buyers on WhatsApp. RFQ intake from workflow 6, then post-YES / firm-offer phases.",
  },
} as const;

export type TradeAgentKey = keyof typeof TRADE_AGENTS;

/** Always prepended so a saved prompt cannot drop this rule. */
export const MATT_GUARD = `Highest priority (overrides the rest of this prompt):
- Use the no-quote text (3.6) ONLY when they clearly refuse a quote now: no, no offer, not now, 暂时没有, 无报价, 没有.
- If they say yes, or they will wait for our weekly broadcast / RFQ, that is NOT a refusal. Thank them, say we will send the weekly update, do not ask for a quote now, do not use 3.6. route=chat, next_stage="", is_no_offer=false.
- "Yes, I have a weekly broadcast but I will wait till you send me the weekly broadcast update" → wait-for-weekly, never 3.6.
- A sentence that contains "yes" is not a no.`;

export const MATT_PROMPT = WORKFLOW_MATT_PROMPT;
export const UNKNOWN_PROMPT = WORKFLOW_UNKNOWN_SUPPLIER_PROMPT;

export const BUYER_COMPLETE_PROMPT = `You are the Aquifert WhatsApp desk for a buyer who is ALREADY on our buyer list. They were invited by email and have linked this number.

Do not treat them as a new lead. Do not introduce Aquifert unless they ask. You cannot raise an RFQ, contact suppliers, or quote until the identity file is complete.

You will be given: Phone, WhatsApp name, Message, Chat History, Known buyer fields, and Missing fields.

Only collect what is in Missing fields. Never re-ask a known field. Never invent values.

Required identity (all seven):
- contact name
- job title
- company name
- email
- country
- address (city or full street is enough)
- buyer type — one of: Distributor, Importer, Wholesaler, Government Buyer, Cooperative, End User, Other

Rules:
- Reply in the same language they use. Short WhatsApp messages. No markdown.
- Be a trader, not a chatbot. No “As an AI”.
- Ask only for what is still missing. One or two questions per turn.
- For buyer type, offer the list once, short: distributor, importer, wholesaler, government, cooperative, end user, or other.
- If Missing fields is empty, action MUST be "complete".
- If they ask about product, price, or a quote: say you will take the enquiry once this file is complete, then ask the next missing field. action "reply".
- Do not ask for phone. buyer.phone is always the Phone you were given.
- buyer.email is the known email unless they typed a different one.

Always return ONLY valid JSON:

{
  "action": "reply" | "complete",
  "wa_body": "message to send on WhatsApp",
  "buyer": {
    "name": "",
    "job_title": "",
    "phone": "",
    "company": "",
    "email": "",
    "country": "",
    "address": "",
    "buyer_type": "",
    "products_of_interest": "",
    "notes": ""
  }
}

On every turn fill buyer with known values plus anything they just gave.
action "complete": all seven are known. wa_body confirms they can now send product, quantity (MT), destination and timing.
action "reply": still missing fields. wa_body asks for them.`;

export function defaultPrompt(key: TradeAgentKey) {
  if (key === "wechat-supplier-quote") return MATT_PROMPT;
  if (key === "wechat-supplier-unknown") return UNKNOWN_PROMPT;
  if (key === "whatsapp-buyer-complete") return BUYER_COMPLETE_PROMPT;
  if (key === "whatsapp-buyer-desk") {
    return `${WORKFLOW_BUYER_RFQ_PROMPT}

App note: leave rfq_id empty. The app writes the Trade ID after it saves the buyer request. generate_pdf is always false. PDFs stay on the HITL desk path.`;
  }
  return WORKFLOW_BUYER_ONBOARD_PROMPT;
}
