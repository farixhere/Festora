import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/primitives";
import { SignInForm } from "@/components/auth/auth-forms";
import { getSession } from "@/lib/auth/session";
import { safeNext } from "@/lib/utils/redirect";
import { firstParam } from "@/lib/utils/query";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = safeNext(firstParam(sp.next));
  if (await getSession().catch(() => null)) redirect(next);

  return (
    <Card className="p-7 sm:p-8">
      <h1 className="text-2xl font-extrabold">Welcome back</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">Sign in to manage your events.</p>
      <SignInForm next={next} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Festora?{" "}
        <Link href={`/sign-up${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </Card>
  );
}
