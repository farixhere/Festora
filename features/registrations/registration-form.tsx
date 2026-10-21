"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { useServerForm } from "@/lib/hooks/use-server-action";
import { registerAction } from "./actions";

export function RegistrationForm({
  slug,
  requiresApproval,
  defaultName,
  defaultEmail,
}: {
  slug: string;
  requiresApproval: boolean;
  defaultName?: string;
  defaultEmail?: string;
}) {
  const { onSubmit, pending, fieldErrors, formError } = useServerForm((fd) =>
    registerAction(slug, fd),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && !Object.keys(fieldErrors).length && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {formError}
        </p>
      )}
      <Field label="Full name" name="fullName" error={fieldErrors.fullName} required>
        {(a) => (
          <Input {...a} name="fullName" autoComplete="name" defaultValue={defaultName} maxLength={120} required />
        )}
      </Field>
      <Field label="Email" name="email" error={fieldErrors.email} required hint="We'll never list your email publicly.">
        {(a) => (
          <Input {...a} name="email" type="email" autoComplete="email" defaultValue={defaultEmail} maxLength={200} required />
        )}
      </Field>
      <Field label="Phone" name="phone" error={fieldErrors.phone} hint="Optional">
        {(a) => <Input {...a} name="phone" type="tel" autoComplete="tel" maxLength={20} />}
      </Field>
      <Field label="College / organization" name="institution" error={fieldErrors.institution} hint="Optional">
        {(a) => <Input {...a} name="institution" autoComplete="organization" maxLength={150} />}
      </Field>
      <Field label="Anything the organizers should know?" name="notes" error={fieldErrors.notes} hint="Optional — dietary needs, accessibility, team name…">
        {(a) => <Textarea {...a} name="notes" maxLength={1000} className="min-h-[80px]" />}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {requiresApproval ? "Request to join" : "Register now"}
      </Button>
      {requiresApproval && (
        <p className="text-center text-xs text-muted-foreground">
          The organizers review every request. You&apos;ll see the decision on your registration page.
        </p>
      )}
    </form>
  );
}
