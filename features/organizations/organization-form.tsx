"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { useServerForm } from "@/lib/hooks/use-server-action";
import { createOrganizationAction, updateOrganizationAction } from "./actions";

type Defaults = { name?: string; description?: string | null; website?: string | null };

export function CreateOrganizationForm({ submitLabel = "Create organization" }: { submitLabel?: string }) {
  const { onSubmit, pending, fieldErrors } = useServerForm((fd) => createOrganizationAction(fd));
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Organization name" name="name" error={fieldErrors.name} required hint="Your club, fest committee, college chapter or company.">
        {(a) => <Input {...a} name="name" maxLength={80} required placeholder="e.g. Pondicherry University Cultural Club" />}
      </Field>
      <Field label="About (optional)" name="description" error={fieldErrors.description}>
        {(a) => <Textarea {...a} name="description" maxLength={500} className="min-h-[90px]" />}
      </Field>
      <Field label="Website (optional)" name="website" error={fieldErrors.website}>
        {(a) => <Input {...a} name="website" type="url" maxLength={200} placeholder="https://" />}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}

export function EditOrganizationForm({
  orgId,
  defaults,
  canEdit,
}: {
  orgId: string;
  defaults: Defaults;
  canEdit: boolean;
}) {
  const { onSubmit, pending, fieldErrors } = useServerForm((fd) => updateOrganizationAction(orgId, fd));
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Organization name" name="name" error={fieldErrors.name} required>
        {(a) => <Input {...a} name="name" defaultValue={defaults.name} maxLength={80} required disabled={!canEdit} />}
      </Field>
      <Field label="About" name="description" error={fieldErrors.description}>
        {(a) => <Textarea {...a} name="description" defaultValue={defaults.description ?? ""} maxLength={500} className="min-h-[90px]" disabled={!canEdit} />}
      </Field>
      <Field label="Website" name="website" error={fieldErrors.website}>
        {(a) => <Input {...a} name="website" type="url" defaultValue={defaults.website ?? ""} maxLength={200} disabled={!canEdit} />}
      </Field>
      {canEdit ? (
        <Button type="submit" loading={pending}>Save changes</Button>
      ) : (
        <p className="text-sm text-muted-foreground">Only owners and admins can edit organization details.</p>
      )}
    </form>
  );
}
