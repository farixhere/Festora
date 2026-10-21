import { put } from "@vercel/blob";
import { randomBytes } from "node:crypto";
import { getUserOrNull, getMemberships } from "@/lib/auth/session";
import { rateLimit } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // stays under Vercel's 4.5 MB request limit

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Detects the real image type from magic bytes (the browser-supplied type is untrusted). */
function sniff(bytes: Uint8Array): { ext: string; type: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", type: "image/jpeg" };
  }
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  ) {
    return { ext: "png", type: "image/png" };
  }
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { ext: "webp", type: "image/webp" };
  }
  return null;
}

export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return json(
      { error: "Image uploads aren't configured. Pick a cover design or paste an image link." },
      501,
    );
  }
  const user = await getUserOrNull();
  if (!user) return json({ error: "Please sign in." }, 401);

  // Only members of at least one organization may upload event covers.
  const memberships = await getMemberships(user.id);
  if (memberships.length === 0) return json({ error: "Create an organization first." }, 403);

  const limit = await rateLimit(`upload:${user.id}`, 20, 600);
  if (!limit.allowed) return json({ error: "Too many uploads. Try again shortly." }, 429);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Invalid upload." }, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "No file provided." }, 400);
  if (file.size === 0) return json({ error: "The file is empty." }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Image must be 4 MB or smaller." }, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return json({ error: "Use a JPEG, PNG or WebP image." }, 415);

  const path = `covers/${user.id}/${randomBytes(8).toString("hex")}.${kind.ext}`;
  const blob = await put(path, file, {
    access: "public",
    contentType: kind.type,
    addRandomSuffix: false,
  });
  return json({ url: blob.url });
}
