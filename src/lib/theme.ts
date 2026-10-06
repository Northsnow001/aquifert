export type Theme = "light" | "dark";

/** Hub colour theme, kept for a year so the server renders the member's choice without a flash. */
export const THEME_COOKIE = "aq_theme";

export const parseTheme = (raw: string | undefined): Theme => (raw === "dark" ? "dark" : "light");
