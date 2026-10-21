import "server-only";
import { db } from "@/lib/db";
import { activityLogs } from "@/lib/db/schema";

type Entry = {
  organizationId: string | null;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

/**
 * Appends to the audit trail. Never throws: a logging failure must not roll
 * back or block the action that was just completed.
 */
export async function logActivity(entry: Entry): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      organizationId: entry.organizationId,
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      summary: entry.summary,
      metadata: entry.metadata ?? null,
    });
  } catch (err) {
    console.error("activity log failed", err);
  }
}
