import { freightCommentary } from "@/data/sample";
import { ACADEMY_COMMENTARY } from "@/lib/tools/academy";
import type { FreightBoard, ToolsCommentary } from "@/lib/content-types";

export const freightBoard: FreightBoard = {
  fixtures: [
    { id: "fx-tianjin", account: "MISC", product: "BHF", qty: "12,000", origin: "Tianjin, China", destination: "Sudan", laycan: "10–15 Sep", visible: true },
    { id: "fx-st-petes", account: "MISC", product: "BHF", qty: "39,000", origin: "St Petes, Russia", destination: "Caribbean", laycan: "15–17 Sep", visible: true },
    { id: "fx-cjk", account: "MISC", product: "BHF", qty: "55,000", origin: "CJK, China", destination: "South Africa", laycan: "9–19 Sep", visible: true },
  ],
  commentary: [`**${freightCommentary.title.toUpperCase()}**`, ...freightCommentary.paragraphs].join("\n\n"),
  showOnHome: false,
  updatedAt: null,
};

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const toolsCommentary: ToolsCommentary = {
  html: [
    `<h2>${escape(ACADEMY_COMMENTARY.title)}</h2>`,
    ...ACADEMY_COMMENTARY.sections.flatMap((section) => [
      `<h3>${escape(section.heading)}</h3>`,
      ...section.paragraphs.map((paragraph) => `<p>${escape(paragraph)}</p>`),
    ]),
  ].join("\n"),
  updatedAt: null,
};
