"use client";

import { Check, Eye, Mail, Phone, School, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { FormDialog } from "@/components/ui/form-dialog";
import { Card, RegistrationStatusBadge } from "@/components/ui/primitives";
import { LocalTime } from "@/components/ui/local-time";
import { useServerAction, useServerForm } from "@/lib/hooks/use-server-action";
import {
  updateParticipantAction,
  updateRegistrationStatusAction,
} from "@/features/registrations/actions";

export type RegRowView = {
  id: string;
  eventTitle: string;
  fullName: string;
  email: string;
  phone: string;
  institution: string;
  notes: string;
  status: "pending" | "confirmed" | "rejected" | "cancelled";
  code: string;
  createdAtIso: string;
};

function EditParticipantForm({
  row,
  canManage,
  onDone,
}: {
  row: RegRowView;
  canManage: boolean;
  onDone: () => void;
}) {
  const { onSubmit, pending, fieldErrors: err } = useServerForm(
    (fd) => updateParticipantAction(row.id, fd),
    { onSuccess: onDone },
  );
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <dl className="grid gap-3 rounded-xl bg-muted p-4 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-semibold uppercase text-muted-foreground">Event</dt><dd className="font-semibold">{row.eventTitle}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-muted-foreground">Status</dt><dd><RegistrationStatusBadge status={row.status} /></dd></div>
        <div><dt className="text-xs font-semibold uppercase text-muted-foreground">Email</dt><dd className="break-all font-semibold">{row.email}</dd></div>
        <div><dt className="text-xs font-semibold uppercase text-muted-foreground">Registered</dt><dd className="font-semibold"><LocalTime iso={row.createdAtIso} /></dd></div>
        <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-muted-foreground">Reference</dt><dd className="font-mono text-xs">{row.code}</dd></div>
      </dl>
      <Field label="Full name" name="fullName" error={err.fullName} required>
        {(a) => <Input {...a} name="fullName" defaultValue={row.fullName} maxLength={120} required disabled={!canManage} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" name="phone" error={err.phone}>
          {(a) => <Input {...a} name="phone" defaultValue={row.phone} maxLength={20} disabled={!canManage} />}
        </Field>
        <Field label="College / organization" name="institution" error={err.institution}>
          {(a) => <Input {...a} name="institution" defaultValue={row.institution} maxLength={150} disabled={!canManage} />}
        </Field>
      </div>
      <Field label="Notes" name="notes" error={err.notes}>
        {(a) => <Textarea {...a} name="notes" defaultValue={row.notes} maxLength={1000} className="min-h-[80px]" disabled={!canManage} />}
      </Field>
      {canManage ? (
        <Button type="submit" loading={pending}>Save details</Button>
      ) : (
        <p className="text-sm text-muted-foreground">Your role can view but not edit participant details.</p>
      )}
    </form>
  );
}

export function RegistrationRow({ row, canManage }: { row: RegRowView; canManage: boolean }) {
  const { run, pending } = useServerAction();

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold">{row.fullName}</h3>
            <RegistrationStatusBadge status={row.status} />
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{row.eventTitle}</p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" aria-hidden />{row.email}</span>
            {row.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" aria-hidden />{row.phone}</span>}
            {row.institution && <span className="inline-flex items-center gap-1"><School className="h-3.5 w-3.5" aria-hidden />{row.institution}</span>}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Registered <LocalTime iso={row.createdAtIso} /></p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {canManage && row.status === "pending" && (
            <>
              <Button size="sm" loading={pending} onClick={() => run(() => updateRegistrationStatusAction(row.id, "confirmed"))}>
                <Check aria-hidden /> Approve
              </Button>
              <ConfirmDialog
                trigger={<Button size="sm" variant="outline"><X aria-hidden /> Reject</Button>}
                title={`Reject ${row.fullName}?`}
                description="Their seat is released and they'll see the registration as not approved. This can't be undone."
                confirmLabel="Reject registration"
                destructive
                onConfirm={() => updateRegistrationStatusAction(row.id, "rejected")}
              />
            </>
          )}
          {canManage && (row.status === "pending" || row.status === "confirmed") && (
            <ConfirmDialog
              trigger={<Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">Cancel</Button>}
              title={`Cancel ${row.fullName}'s registration?`}
              description="Their seat is released for others. This can't be undone — they would need to register again."
              confirmLabel="Cancel registration"
              destructive
              onConfirm={() => updateRegistrationStatusAction(row.id, "cancelled")}
            />
          )}
          <FormDialog
            trigger={<Button size="sm" variant="secondary"><Eye aria-hidden /> Details</Button>}
            title={row.fullName}
            description="Registration details"
          >
            {({ close }) => <EditParticipantForm row={row} canManage={canManage} onDone={close} />}
          </FormDialog>
        </div>
      </div>
    </Card>
  );
}
