export type FeedView = "list" | "grid";
export type FeedName = "analysis" | "telex";

export const feedViewCookie = (feed: FeedName) => `aq_view_${feed}`;

export const parseFeedView = (raw: string | undefined): FeedView => (raw === "grid" ? "grid" : "list");
