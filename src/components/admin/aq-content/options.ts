import { NITROGEN_PRODUCTS, type AnalysisNote, type BalanceRow, type BriefingIssue } from "@/lib/aq-modules/types";

export const ANALYSIS_PRODUCTS = [...NITROGEN_PRODUCTS, "DAP", "MAP", "MOP", "Freight"];
export const ANALYSIS_REGIONS = ["Middle East", "South Asia", "East Asia", "Europe", "North America", "South America", "Africa", "FSU", "Global"];
export const SUMMARY_LIMIT = 240;
export const DEFAULT_AUTHOR = "Aquifert Desk";

export type AnalysisInput = Omit<AnalysisNote, "id"> & { id?: string };
export type BriefingInput = Omit<BriefingIssue, "id"> & { id?: string };
export type BalanceInput = BalanceRow;

export type TelexOption = { id: string; headline: string; publishedAt: string };
