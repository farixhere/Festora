/** Builds "?a=1&b=2" from defined, non-empty values. */
export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Next.js searchParams values can be string | string[] | undefined. */
export function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function pageParam(v: string | string[] | undefined): number {
  const n = Number(firstParam(v));
  return Number.isInteger(n) && n >= 1 && n <= 10000 ? n : 1;
}
