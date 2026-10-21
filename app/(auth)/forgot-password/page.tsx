import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/primitives";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { isEmailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <Card className="p-7 sm:p-8">
      <h1 className="text-2xl font-extrabold">Reset your password</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a link to choose a new one.
      </p>
      <ForgotPasswordForm emailConfigured={isEmailConfigured()} />
      <p className="mt-6 text-center text-sm">
        <Link href="/sign-in" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}
