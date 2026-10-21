import { randomBytes } from "node:crypto";

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** Short random suffix used to make slugs unique without a lookup loop. */
export function randomSuffix(length = 5): string {
  return randomBytes(8).toString("hex").slice(0, length);
}

/** Public, unguessable registration reference, e.g. "FST-k3J9xQ2mZp7R". */
export function newRegistrationCode(): string {
  return `FST-${randomBytes(9).toString("base64url")}`;
}
