/**
 * Client-review demo mode — no real auth provider, no real database.
 * Existing Kimi / identity / Drizzle code stays intact; this layer short-circuits
 * when DEMO_MODE=true (or when DATABASE_URL is empty in development).
 */
import type { User } from "@db/schema";
import { DEMO_PERSONAS } from "@contracts/constants";
import { env } from "../lib/env";

export const DEMO_EMAIL = "demo@aquifert.com";
export const DEMO_PASSWORD = "demo1234";
export const DEMO_REVIEWER_UNION_ID = "demo_reviewer";

export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true") return true;
  // Local review without Supabase still gets a working shell
  if (!env.isProduction && !env.databaseUrl) return true;
  return false;
}

function baseUser(partial: Partial<User> & Pick<User, "id" | "unionId" | "name" | "portalRole">): User {
  const now = new Date();
  return {
    email: null,
    avatar: null,
    role: "user",
    phone: null,
    organizationId: 1,
    demoUserId: null,
    language: "EN",
    createdAt: now,
    updatedAt: now,
    lastSignInAt: now,
    ...partial,
  };
}

/** Mutable in-memory directory — persona switch updates the reviewer's demoUserId */
const usersByUnionId = new Map<string, User>();

function seed() {
  if (usersByUnionId.size > 0) return;
  const orgId = 1;
  const personas: User[] = [
    baseUser({
      id: 1,
      unionId: DEMO_REVIEWER_UNION_ID,
      name: "Client Reviewer",
      email: DEMO_EMAIL,
      role: "admin",
      portalRole: "ADMIN",
      organizationId: orgId,
    }),
    baseUser({
      id: 2,
      unionId: "demo_admin",
      name: "Alex Admin",
      email: "admin@aquifert.demo",
      role: "admin",
      portalRole: "ADMIN",
      organizationId: orgId,
    }),
    baseUser({
      id: 3,
      unionId: "demo_buyer_2",
      name: "Harper Harvest",
      email: "harvest@buyer.demo",
      portalRole: "BUYER",
      organizationId: 2,
    }),
    baseUser({
      id: 4,
      unionId: "demo_buyer_5",
      name: "Blake Browse",
      email: "browse@buyer.demo",
      portalRole: "BUYER",
      organizationId: 3,
    }),
    baseUser({
      id: 5,
      unionId: "demo_supplier_1",
      name: "Sam Supplier",
      email: "export@supplier.demo",
      portalRole: "SUPPLIER",
      organizationId: 4,
    }),
  ];
  for (const u of personas) usersByUnionId.set(u.unionId, u);
}

export function getDemoUserByUnionId(unionId: string): User | undefined {
  seed();
  return usersByUnionId.get(unionId);
}

export function getDemoReviewer(): User {
  seed();
  return usersByUnionId.get(DEMO_REVIEWER_UNION_ID)!;
}

export function resolveDemoUser(sessionUnionId: string): User | null {
  seed();
  const sessionUser = usersByUnionId.get(sessionUnionId);
  if (!sessionUser) return null;
  if (sessionUser.demoUserId) {
    for (const u of usersByUnionId.values()) {
      if (u.id === sessionUser.demoUserId) return { ...u };
    }
  }
  return { ...sessionUser };
}

export function setDemoPersona(sessionUnionId: string, personaUnionId: string): User | null {
  seed();
  const sessionUser = usersByUnionId.get(sessionUnionId);
  const persona = usersByUnionId.get(personaUnionId);
  if (!sessionUser || !persona) return null;
  sessionUser.demoUserId = persona.id;
  sessionUser.portalRole = persona.portalRole;
  sessionUser.updatedAt = new Date();
  return { ...persona };
}

export function clearDemoPersona(sessionUnionId: string): void {
  seed();
  const sessionUser = usersByUnionId.get(sessionUnionId);
  if (!sessionUser) return;
  sessionUser.demoUserId = null;
  sessionUser.portalRole = "ADMIN";
  sessionUser.updatedAt = new Date();
}

export function setDemoLanguage(sessionUnionId: string, language: "EN" | "ZH"): void {
  seed();
  const sessionUser = usersByUnionId.get(sessionUnionId);
  if (!sessionUser) return;
  sessionUser.language = language;
  if (sessionUser.demoUserId) {
    for (const u of usersByUnionId.values()) {
      if (u.id === sessionUser.demoUserId) u.language = language;
    }
  }
}

export function demoMembershipFor(user: User) {
  // Harvest member persona gets an active membership; non-member buyer does not
  if (user.unionId !== "demo_buyer_2" && user.portalRole !== "BUYER") {
    if (user.portalRole === "ADMIN" || user.portalRole === "OPERATIONS") {
      return {
        id: 1,
        userId: user.id,
        tier: "HARVEST" as const,
        status: "ACTIVE" as const,
        monthlyTonnageLimit: 5000,
        currentMonthTonnage: 420,
        price: 499,
        billingCycle: "MONTHLY" as const,
        startDate: new Date(),
        endDate: null,
        autoRenew: true,
        createdAt: new Date(),
      };
    }
  }
  if (user.unionId === "demo_buyer_2") {
    return {
      id: 2,
      userId: user.id,
      tier: "HARVEST" as const,
      status: "ACTIVE" as const,
      monthlyTonnageLimit: 2000,
      currentMonthTonnage: 180,
      price: 299,
      billingCycle: "MONTHLY" as const,
      startDate: new Date(),
      endDate: null,
      autoRenew: true,
      createdAt: new Date(),
    };
  }
  return null;
}

export function demoOrganizationFor(user: User) {
  const name =
    user.portalRole === "SUPPLIER"
      ? "Demo Export Co."
      : user.portalRole === "BUYER"
        ? "Demo Agri Imports"
        : "Aquifert Demo Org";
  return {
    id: user.organizationId ?? 1,
    name,
    type: (user.portalRole === "SUPPLIER" ? "SUPPLIER" : "BUYER") as "BUYER" | "SUPPLIER",
    country: "United Kingdom",
    address: "London",
    vatNumber: null,
    contactPerson: user.name,
    wechatId: null,
    bankDetails: null,
    marginProfilePct: 3.5,
    verified: true,
    createdAt: new Date(),
  };
}

export function isValidDemoLogin(identifier: string, password: string): boolean {
  const id = identifier.trim().toLowerCase();
  return (
    password === DEMO_PASSWORD &&
    (id === DEMO_EMAIL || id === "demo" || id === DEMO_REVIEWER_UNION_ID)
  );
}

export { DEMO_PERSONAS };
