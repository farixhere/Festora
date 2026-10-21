import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/providers";
import { BottomNav, OrgSwitcher, SideNav, UserMenu } from "@/components/dashboard/nav";
import { requireOrgContext } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, org, memberships } = await requireOrgContext();
  const orgs = memberships.map((m) => ({ id: m.org.id, name: m.org.name }));
  const showAdmin = isPlatformAdmin(user.id);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-6 border-r bg-card/60 p-4 lg:flex">
        <Link href="/dashboard" aria-label="Festora dashboard" className="px-1.5 pt-1">
          <Logo />
        </Link>
        <OrgSwitcher orgs={orgs} activeId={org.id} />
        <SideNav showAdmin={showAdmin} />
        <p className="mt-auto px-2 text-xs text-muted-foreground">Signed in as {user.email}</p>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3 lg:hidden">
            <Link href="/dashboard" aria-label="Festora dashboard" className="shrink-0">
              <Logo showWordmark={false} />
            </Link>
            <div className="min-w-0 max-w-[55vw]">
              <OrgSwitcher orgs={orgs} activeId={org.id} />
            </div>
          </div>
          <p className="hidden text-sm font-semibold text-muted-foreground lg:block">{org.name}</p>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <UserMenu name={user.name} email={user.email} />
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
