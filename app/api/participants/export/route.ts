import type { NextRequest } from "next/server";
import { getUserOrNull, resolveActiveOrg } from "@/lib/auth/session";
import { getEventAccess } from "@/lib/permissions/access";
import { can } from "@/lib/permissions";
import { listRegistrationsForExport } from "@/features/registrations/queries";
import { toCsv } from "@/lib/utils/csv";
import { slugify } from "@/lib/utils/slug";
import type { RegistrationStatus } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "confirmed", "rejected", "cancelled"];

function deny(status: number, message: string) {
  return new Response(message, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * CSV export of participant data. Requires the "participants.export"
 * permission in the event's (or active) organization; query params can only
 * narrow results, never widen them beyond that organization.
 */
export async function GET(req: NextRequest) {
  const user = await getUserOrNull();
  if (!user) return deny(401, "Please sign in.");

  const params = req.nextUrl.searchParams;
  const eventId = params.get("event") || undefined;
  const statusParam = params.get("status") || "all";
  const q = (params.get("q") || "").slice(0, 100);

  let orgId: string;
  if (eventId) {
    const access = await getEventAccess(eventId, user.id, "participants.export");
    if (!access) return deny(404, "Not found.");
    orgId = access.event.organizationId;
  } else {
    const active = await resolveActiveOrg(user.id);
    if (!active) return deny(403, "No organization.");
    if (!can(active.role, "participants.export")) {
      return deny(403, "Your role can't export participant data.");
    }
    orgId = active.org.id;
  }

  const status = STATUSES.includes(statusParam)
    ? (statusParam as RegistrationStatus)
    : "all";
  const rows = await listRegistrationsForExport({ orgId, eventId, status, q });

  const csv = toCsv([
    ["Name", "Email", "Phone", "Institution", "Event", "Status", "Registered at (UTC)", "Reference", "Notes"],
    ...rows.map((r) => [
      r.fullName,
      r.email,
      r.phone,
      r.institution,
      r.eventTitle,
      r.status,
      r.createdAt.toISOString(),
      r.code,
      r.notes,
    ]),
  ]);

  const name = slugify(rows[0]?.eventTitle ?? "participants") || "participants";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="festora-${name}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
