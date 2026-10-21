import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/primitives";
import { SignUpForm } from "@/components/auth/auth-forms";
import { getSession } from "@/lib/auth/session";
import { safeNext } from "@/lib/utils/redirect";
import { firstParam } from "@/lib/utils/query";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create your account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawNext = firstParam(sp.next);
  const next = rawNext ? safeNext(rawNext) : undefined;
  if (await getSession().catch(() => null)) redirect(next ?? "/dashboard");

  return (
    <Card className="p-7 sm:p-8">
      <h1 className="text-2xl font-extrabold">Start organizing</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Create your free account. Registering for events doesn&apos;t need one.
      </p>
      <SignUpForm next={next} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
