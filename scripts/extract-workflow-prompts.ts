/**
 * Pulls WF2 / WF6 agent system messages into src/lib/wechat/workflow-prompts.ts
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";

function walk(node: unknown, found: string[]) {
  if (!node || typeof node !== "object") return;
  const rec = node as Record<string, unknown>;
  if (typeof rec.systemMessage === "string") found.push(rec.systemMessage.replace(/^=/, ""));
  for (const value of Object.values(rec)) walk(value, found);
}

function adapt(text: string) {
  return text
    .replace(/\bmills\b/gi, "suppliers")
    .replace(/\bmill\b/gi, "supplier")
    .replace(/Suppliers_Responses and Suppliers_Offers sheets/g, "supplier quotes in the trade book")
    .replace(/the \*\*Aquifert Trade Database\*\* workbook/g, "the Aquifert trade book")
    .replace(/Aquifert Trade Database workbook/g, "Aquifert trade book")
    .replace(/n8n can save it/g, "the app can save it")
    .replace(/sent by n8n/g, "sent by the desk")
    .replace(/For n8n only/g, "Internal only")
    .replace(/n8n fills these/g, "the desk fills these")
    .replace(/n8n uses this/g, "the desk uses this")
    .replace(/n8n adds MT/g, "the desk stores MT")
    .replace(/n8n then adds them/g, "the app then adds them")
    .replace(/\bn8n\b/g, "the desk")
    .replace(/suppliers \(suppliers\)/gi, "suppliers")
    .replace(/Agent \(the desk\)/g, "Agent")
    .replace(/from the desk memory/g, "from this thread")
    .replace(/## Notes for the n8n builder[\s\S]*$/m, "")
    .replace(/look up the Buyers Request sheet in the Aquifert trade database[\s\S]*?Copy it character for character into rfq_id\. Never invent, guess, or reformat a Trade ID, and never use another buyer’s row\./,
      "Leave rfq_id empty. The app allocates the Trade ID when it saves the buyer request.")
    .trim();
}

const wf2 = JSON.parse(readFileSync(path.join("n8n_workflows", "2.  WeChat Conversation  Supplier Only- Workflow 2 (1).json"), "utf8"));
const wf6 = JSON.parse(readFileSync(path.join("n8n_workflows", "6. Buyer's Product Enquiry and Conversation Flow on Whatsapp (2).json"), "utf8"));
const matt: string[] = [];
const buyer: string[] = [];
walk(wf2, matt);
walk(wf6, buyer);

const mattPrompt = adapt(matt.sort((a, b) => b.length - a.length)[0] ?? "");
const unknownPrompt = adapt(matt.filter((s) => s.includes("not yet on our supplier list")).sort((a, b) => b.length - a.length)[0] ?? "");
const rfqPrompt = adapt(buyer.find((s) => s.includes("AQ Buyer Desk")) ?? "");
const onboardPrompt = adapt(buyer.find((s) => s.includes("not yet on our buyer list")) ?? "");

const out = `/* Extracted from n8n WF2 / WF6. Sheet/n8n wording mapped to the trade book. */
export const WORKFLOW_MATT_PROMPT = ${JSON.stringify(mattPrompt)};
export const WORKFLOW_UNKNOWN_SUPPLIER_PROMPT = ${JSON.stringify(unknownPrompt)};
export const WORKFLOW_BUYER_RFQ_PROMPT = ${JSON.stringify(rfqPrompt)};
export const WORKFLOW_BUYER_ONBOARD_PROMPT = ${JSON.stringify(onboardPrompt)};
`;

writeFileSync(path.join("src", "lib", "wechat", "workflow-prompts.ts"), out, "utf8");
console.log({
  matt: mattPrompt.length,
  unknown: unknownPrompt.length,
  rfq: rfqPrompt.length,
  onboard: onboardPrompt.length,
});
