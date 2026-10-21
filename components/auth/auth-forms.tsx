"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { authClient } from "@/lib/auth/client";
import { safeNext } from "@/lib/utils/redirect";
import {
  forgotSchema,
  resetSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/misc";

type AuthError = { message?: string; code?: string; status?: number } | null | undefined;

function friendly(error: AuthError, fallback: string): string {
  if (!error) return fallback;
  if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
  return error.message || fallback;
}

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-11" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:text-foreground"
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
      >
        {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

/* ───────── Sign in ───────── */
type SignInValues = z.infer<typeof signInSchema>;

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: SignInValues) {
    setError(null);
    const { error: err } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    if (err) {
      setError(
        err.status === 401 || err.status === 400
          ? "That email and password don't match. Check them and try again."
          : friendly(err, "Couldn't sign you in. Please try again."),
      );
      return;
    }
    toast.success("Welcome back!");
    router.push(safeNext(next));
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormError message={error} />
      <Field label="Email" name="email" error={errors.email?.message}>
        {(a) => <Input {...a} type="email" autoComplete="email" {...form.register("email")} />}
      </Field>
      <Field label="Password" name="password" error={errors.password?.message}>
        {(a) => <PasswordInput {...a} autoComplete="current-password" {...form.register("password")} />}
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Sign in
      </Button>
    </form>
  );
}

/* ───────── Sign up ───────── */
type SignUpValues = z.infer<typeof signUpSchema>;

export function SignUpForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: SignUpValues) {
    setError(null);
    const { error: err } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
    });
    if (err) {
      const duplicate =
        err.code === "USER_ALREADY_EXISTS" ||
        err.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" ||
        /already exists/i.test(err.message ?? "");
      if (duplicate) {
        form.setError("email", { message: "An account with this email already exists." });
        setError("That email is already registered. Try signing in instead.");
      } else {
        setError(friendly(err, "Couldn't create your account. Please try again."));
      }
      return;
    }
    toast.success("Account created — let's set up your organization.");
    // Organizers create their first organization on /onboarding.
    router.push(next ? `/onboarding?next=${encodeURIComponent(safeNext(next))}` : "/onboarding");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormError message={error} />
      <Field label="Your name" name="name" error={errors.name?.message}>
        {(a) => <Input {...a} autoComplete="name" {...form.register("name")} />}
      </Field>
      <Field label="Email" name="email" error={errors.email?.message}>
        {(a) => <Input {...a} type="email" autoComplete="email" {...form.register("email")} />}
      </Field>
      <Field label="Password" name="password" error={errors.password?.message} hint="At least 8 characters.">
        {(a) => <PasswordInput {...a} autoComplete="new-password" {...form.register("password")} />}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Create account
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        By creating an account you agree to use Festora responsibly and to handle participant data with care.
      </p>
    </form>
  );
}

/* ───────── Forgot password ───────── */
type ForgotValues = z.infer<typeof forgotSchema>;

export function ForgotPasswordForm({ emailConfigured }: { emailConfigured: boolean }) {
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: ForgotValues) {
    setError(null);
    const { error: err } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: "/reset-password",
    });
    if (err && err.status === 429) {
      setError(friendly(err, ""));
      return;
    }
    // Same response whether or not the account exists (no account enumeration).
    setSent(true);
  }

  if (sent) {
    return (
      <div role="status" className="space-y-3 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden />
        <p className="font-bold">Check your inbox</p>
        <p className="text-sm text-muted-foreground">
          If an account exists for that email, a reset link is on its way. It expires in 1 hour.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      {!emailConfigured && (
        <p role="note" className="rounded-xl bg-warning/10 p-3 text-sm font-medium text-warning">
          Email delivery isn&apos;t configured on this deployment yet, so reset emails can&apos;t be sent.
          Ask the site administrator to set up email (see the README), or contact them to reset your password.
        </p>
      )}
      <FormError message={error} />
      <Field label="Email" name="email" error={errors.email?.message}>
        {(a) => <Input {...a} type="email" autoComplete="email" {...form.register("email")} />}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Send reset link
      </Button>
    </form>
  );
}

/* ───────── Reset password ───────── */
type ResetValues = z.infer<typeof resetSchema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: ResetValues) {
    setError(null);
    const { error: err } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });
    if (err) {
      setError(friendly(err, "This reset link is invalid or has expired. Request a new one."));
      return;
    }
    toast.success("Password updated. Please sign in.");
    router.push("/sign-in");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormError message={error} />
      <Field label="New password" name="password" error={errors.password?.message} hint="At least 8 characters.">
        {(a) => <PasswordInput {...a} autoComplete="new-password" {...form.register("password")} />}
      </Field>
      <Field label="Confirm new password" name="confirm" error={errors.confirm?.message}>
        {(a) => <PasswordInput {...a} autoComplete="new-password" {...form.register("confirm")} />}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Update password
      </Button>
    </form>
  );
}
