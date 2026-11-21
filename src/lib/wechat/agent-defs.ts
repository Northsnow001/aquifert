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

export function defaultPrompt(key: TradeAgentKey) {
  if (key === "wechat-supplier-quote") return MATT_PROMPT;
  if (key === "wechat-supplier-unknown") return UNKNOWN_PROMPT;
  if (key === "whatsapp-buyer-desk") {
    return `${WORKFLOW_BUYER_RFQ_PROMPT}

App note: leave rfq_id empty. The app writes the Trade ID after it saves the buyer request. generate_pdf is always false. PDFs stay on the HITL desk path.`;
  }
  return WORKFLOW_BUYER_ONBOARD_PROMPT;
}
