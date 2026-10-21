import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { firstParam } from "@/lib/utils/query";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const token = firstParam(sp.token);
  const invalid = !token || Boolean(firstParam(sp.error));

  return (
    <Card className="p-7 sm:p-8">
      {invalid ? (
        <div className="text-center">
          <h1 className="text-2xl font-extrabold">Link expired</h1>
          <p className="mb-6 mt-2 text-sm text-muted-foreground">
            This password reset link is invalid or has expired. Request a new one.
          </p>
          <Link href="/forgot-password" className={buttonVariants()}>
            Request a new link
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-extrabold">Choose a new password</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            You&apos;ll be signed out everywhere else once it&apos;s changed.
          </p>
          <ResetPasswordForm token={token} />
        </>
      )}
    </Card>
  );
}
