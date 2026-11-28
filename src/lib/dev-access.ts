import type { SessionUser } from "@/lib/session-shared";

export const DEMO_COOKIE = "aq_demo";

/** True only under `next dev`; every build, including Vercel previews, runs with NODE_ENV=production. */
export const DEV_LOGIN = process.env.NODE_ENV === "development";

export const DEV_USER: SessionUser = {
  id: "demo",
  email: "demo@aquifert.local",
  name: "Demo Admin",
  firstName: "Demo",
  lastName: "Admin",
  plan: "enterprise",
  admin: true,
};
