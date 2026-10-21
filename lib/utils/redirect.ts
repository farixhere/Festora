/**
 * Only same-site relative paths are accepted as post-login redirects. This
 * blocks open-redirect attacks such as ?next=//evil.com or ?next=https://….
 */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  // Control characters could be used to smuggle a different target.
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}
