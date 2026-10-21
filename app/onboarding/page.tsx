import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/primitives";
import { CreateOrganizationForm } from "@/features/organizations/organization-form";
import { getMemberships, requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Set up your organization" };

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  const memberships = await getMemberships(user.id);
  if (memberships.length > 0) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="grain absolute inset-0 -z-10 opacity-60" aria-hidden />
      <main id="main" className="w-full max-w-lg animate-page-in">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card className="p-7 sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <Building2 className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold">Welcome, {user.name.split(" ")[0]}!</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            Events live inside an organization — your club, committee or company. You can invite
            teammates and create more organizations later.
          </p>
          <CreateOrganizationForm />
        </Card>
      </main>
    </div>
  );
}
