export type ShareKind = "telex" | "aq-view";

export const SHARE_SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://aquifert.com").replace(/\/$/, "");

export const sharePath = (kind: ShareKind, key: string) => `/share/${kind}/${encodeURIComponent(key)}`;

/** The public link an admin posts on LinkedIn, X or Instagram. */
export const shareUrl = (kind: ShareKind, key: string) => `${SHARE_SITE}${sharePath(kind, key)}`;

/** Where the reader lands once signed in. */
export const hubPathFor = (kind: ShareKind, key: string) =>
  kind === "telex" ? `/hub/telex/${encodeURIComponent(key)}` : `/hub/analysis/${encodeURIComponent(key)}`;

export const signUpFor = (kind: ShareKind, key: string) => `/register?redirect_to=${encodeURIComponent(hubPathFor(kind, key))}`;
export const signInFor = (kind: ShareKind, key: string) => `/login?redirect_to=${encodeURIComponent(hubPathFor(kind, key))}`;

export const linkedInShare = (url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
