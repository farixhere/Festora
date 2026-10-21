"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/form";
import { CopyButton } from "@/components/ui/copy-button";
import { authClient } from "@/lib/auth/client";
import { profileSchema } from "@/lib/validation/misc";

type ProfileValues = z.infer<typeof profileSchema>;

export function ProfileForm({ name }: { name: string }) {
  const router = useRouter();
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: ProfileValues) {
    const { error } = await authClient.updateUser({ name: values.name });
    if (error) {
      toast.error(error.message ?? "Couldn't update your profile.");
      return;
    }
    toast.success("Profile updated.");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Field label="Display name" name="name" error={errors.name?.message}>
        {(a) => <Input {...a} autoComplete="name" {...form.register("name")} />}
      </Field>
      <Button type="submit" loading={isSubmitting}>Save profile</Button>
    </form>
  );
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(8, "Use at least 8 characters").max(128),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "Passwords don't match" });
type PasswordValues = z.infer<typeof passwordSchema>;

export function ChangePasswordForm() {
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: PasswordValues) {
    const { error } = await authClient.changePassword({
      currentPassword: values.current,
      newPassword: values.next,
      revokeOtherSessions: true,
    });
    if (error) {
      if (error.status === 400 || error.status === 401) {
        form.setError("current", { message: "That isn't your current password." });
      } else {
        toast.error(error.message ?? "Couldn't change your password.");
      }
      return;
    }
    toast.success("Password changed. Other devices were signed out.");
    form.reset();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Field label="Current password" name="current" error={errors.current?.message}>
        {(a) => <Input {...a} type="password" autoComplete="current-password" {...form.register("current")} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" name="next" error={errors.next?.message}>
          {(a) => <Input {...a} type="password" autoComplete="new-password" {...form.register("next")} />}
        </Field>
        <Field label="Confirm new password" name="confirm" error={errors.confirm?.message}>
          {(a) => <Input {...a} type="password" autoComplete="new-password" {...form.register("confirm")} />}
        </Field>
      </div>
      <Button type="submit" loading={isSubmitting}>Change password</Button>
    </form>
  );
}

export function SignOutOthersButton() {
  const [pending, setPending] = React.useState(false);
  async function go() {
    setPending(true);
    const { error } = await authClient.revokeOtherSessions();
    setPending(false);
    if (error) toast.error("Couldn't sign out other devices.");
    else toast.success("Signed out of all other devices.");
  }
  return (
    <Button type="button" variant="outline" loading={pending} onClick={go}>
      Sign out other devices
    </Button>
  );
}

const deleteSchema = z.object({ password: z.string().min(1, "Enter your password") });
type DeleteValues = z.infer<typeof deleteSchema>;

export function DeleteAccountSection() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const form = useForm<DeleteValues>({
    resolver: zodResolver(deleteSchema),
    defaultValues: { password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: DeleteValues) {
    const { error } = await authClient.deleteUser({ password: values.password });
    if (error) {
      toast.error(error.message ?? "Couldn't delete your account.");
      return;
    }
    toast.success("Your account was deleted.");
    router.push("/");
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" className="text-destructive" onClick={() => setOpen(true)}>
        Delete my account…
      </Button>
    );
  }
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4 rounded-xl border border-destructive/40 p-4">
      <p className="text-sm text-muted-foreground">
        This permanently deletes your account and sign-in. Registrations you made stay with the
        events' organizers as records, but are no longer linked to you. You must delete or hand over
        organizations you own first.
      </p>
      <Field label="Confirm with your password" name="password" error={errors.password?.message}>
        {(a) => <Input {...a} type="password" autoComplete="current-password" {...form.register("password")} />}
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" loading={isSubmitting}>Permanently delete account</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

export function AccountIdRow({ id }: { id: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 text-xs">{id}</code>
      <CopyButton value={id} label="Copy ID" />
    </div>
  );
}

export { ConfirmDialog };
