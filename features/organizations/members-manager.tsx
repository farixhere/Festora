"use client";

import { UserPlus, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/primitives";
import { useServerAction, useServerForm } from "@/lib/hooks/use-server-action";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import type { MemberRole } from "@/lib/db/schema";
import { addMemberAction, removeMemberAction, updateMemberRoleAction } from "./actions";

export type MemberView = {
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  canModify: boolean;
  isYou: boolean;
};

function AddMemberForm({ orgId, roles }: { orgId: string; roles: MemberRole[] }) {
  const { onSubmit, pending, fieldErrors: err } = useServerForm((fd) => addMemberAction(orgId, fd), {
    resetOnSuccess: true,
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3 rounded-xl border border-dashed p-4 sm:grid-cols-[1fr_180px_auto] sm:items-start">
      <Field label="Teammate's email" name="email" error={err.email} hint="They need a Festora account first.">
        {(a) => <Input {...a} name="email" type="email" required placeholder="name@college.edu" />}
      </Field>
      <Field label="Role" name="role" error={err.role}>
        {(a) => (
          <Select {...a} name="role" defaultValue={roles.includes("organizer") ? "organizer" : roles[0]}>
            {roles.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>
        )}
      </Field>
      <Button type="submit" loading={pending} className="sm:mt-7">
        <UserPlus aria-hidden /> Add
      </Button>
    </form>
  );
}

export function MembersManager({
  orgId,
  members,
  assignable,
  canManage,
}: {
  orgId: string;
  members: MemberView[];
  assignable: MemberRole[];
  canManage: boolean;
}) {
  const { run, pending } = useServerAction();

  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-xl border">
        {members.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate font-bold">
                {m.name} {m.isYou && <span className="text-xs font-medium text-muted-foreground">(you)</span>}
              </p>
              <p className="truncate text-sm text-muted-foreground">{m.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {canManage && m.canModify ? (
                <>
                  <label htmlFor={`role-${m.userId}`} className="sr-only">Role for {m.name}</label>
                  <Select
                    id={`role-${m.userId}`}
                    defaultValue={m.role}
                    disabled={pending}
                    className="h-10 w-36"
                    onChange={(e) => run(() => updateMemberRoleAction(orgId, m.userId, e.target.value))}
                  >
                    {assignable.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </Select>
                  <ConfirmDialog
                    trigger={<Button variant="ghost" size="icon" aria-label={`Remove ${m.name}`} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><UserX aria-hidden /></Button>}
                    title={`Remove ${m.name}?`}
                    description="They'll immediately lose access to this organization's events and participant data."
                    confirmLabel="Remove member"
                    destructive
                    onConfirm={() => removeMemberAction(orgId, m.userId)}
                  />
                </>
              ) : (
                <Badge tone={m.role === "owner" ? "primary" : "neutral"}>{ROLE_LABELS[m.role]}</Badge>
              )}
              {m.isYou && m.role !== "owner" && (
                <ConfirmDialog
                  trigger={<Button variant="outline" size="sm">Leave</Button>}
                  title="Leave this organization?"
                  description="You'll lose access to its events and participant data."
                  confirmLabel="Leave"
                  destructive
                  onConfirm={() => removeMemberAction(orgId, m.userId)}
                />
              )}
            </div>
          </li>
        ))}
      </ul>

      {canManage && assignable.length > 0 && <AddMemberForm orgId={orgId} roles={assignable} />}

      <details className="rounded-xl bg-muted p-4 text-sm">
        <summary className="cursor-pointer font-semibold">What can each role do?</summary>
        <dl className="mt-3 space-y-2">
          {(Object.keys(ROLE_LABELS) as MemberRole[]).map((r) => (
            <div key={r}>
              <dt className="font-semibold">{ROLE_LABELS[r]}</dt>
              <dd className="text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
