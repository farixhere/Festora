"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteOrganizationAction } from "@/features/organizations/actions";

export function DeleteOrganizationButton({ orgId, name }: { orgId: string; name: string }) {
  return (
    <ConfirmDialog
      trigger={<Button variant="destructive">Delete organization…</Button>}
      title={`Delete ${name}?`}
      description="This permanently deletes the organization with all its events, programs, schedules, registrations and announcements. It cannot be undone."
      confirmLabel="Delete forever"
      destructive
      requireText={name}
      onConfirm={(typed) => deleteOrganizationAction(orgId, typed)}
    />
  );
}
