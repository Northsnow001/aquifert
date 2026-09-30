export type Plan = "core" | "growth" | "enterprise";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  plan: Plan;
  firstName?: string;
  lastName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  country?: string;
  /** Set from Supabase app_metadata.role, which only the service role or SQL can change. */
  admin?: boolean;
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
