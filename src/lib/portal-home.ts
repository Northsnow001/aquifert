/** Default in-app destination after login / logo click, by portal role. */
export function portalHome(role?: string | null): string {
  if (!role) return "/onboarding";
  if (["ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"].includes(role)) return "/admin";
  // Free-plan buyers land on Hub (market view), not the empty trading dashboard.
  if (role === "BUYER") return "/hub";
  return "/supplier";
}
