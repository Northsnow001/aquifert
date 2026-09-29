/** Allow-list validation for redirect_to, internal absolute paths only. */
export function safeRedirectPath(path: string | undefined): string {
  if (!path) return "/";
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return "/";
  return path;
}
