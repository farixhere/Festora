import type { ZodError } from "zod";

/** Standard return shape for every server action. */
export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T; redirectTo?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function fail(
  error: string,
  fieldErrors?: Record<string, string>,
): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  return { ok: false, error, fieldErrors };
}

export function succeed<T = undefined>(opts?: {
  message?: string;
  data?: T;
  redirectTo?: string;
}): ActionResult<T> {
  return { ok: true, ...opts };
}

export function zodFieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export function formDataToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  fd.forEach((value, key) => {
    if (typeof value === "string") out[key] = value;
  });
  return out;
}
