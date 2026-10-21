"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, LayoutDashboard, LogOut, Megaphone, Settings, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils/cn";
import { Select } from "@/components/ui/form";
import { switchOrganizationAction } from "@/features/organizations/actions";

const ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard/participants", label: "Participants", icon: Users },
  { href: "/dashboard/announcements", label: "Announcements", icon: Megaphone },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function useActive() {
  const pathname = usePathname();
  return (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav({ showAdmin }: { showAdmin: boolean }) {
  const isActive = useActive();
  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-card"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
            {label}
          </Link>
        );
      })}
      {showAdmin && (
        <Link
          href="/admin"
          className="mt-3 flex items-center gap-3 rounded-xl border border-dashed px-3.5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <ShieldCheck className="h-[18px] w-[18px]" aria-hidden />
          Platform admin
        </Link>
      )}
    </nav>
  );
}

export function BottomNav() {
  const isActive = useActive();
  return (
    <nav
      aria-label="Dashboard"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className={cn("h-5 w-5", active && "scale-110")} aria-hidden />
            <span className="max-w-full truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function OrgSwitcher({
  orgs,
  activeId,
}: {
  orgs: { id: string; name: string }[];
  activeId: string;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  function onChange(value: string) {
    if (value === "__new__") {
      router.push("/dashboard/organizations/new");
      return;
    }
    start(async () => {
      const res = await switchOrganizationAction(value);
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div>
      <label htmlFor="org-switcher" className="sr-only">
        Organization
      </label>
      <Select
        id="org-switcher"
        value={activeId}
        onChange={(e) => onChange(e.target.value)}
        disabled={pending}
        className="h-10 font-semibold"
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
        <option value="__new__">+ New organization…</option>
      </Select>
    </div>
  );
}

export function UserMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  function signOut() {
    start(async () => {
      const { error } = await authClient.signOut();
      if (error) {
        toast.error("Couldn't sign you out. Please try again.");
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <details className="relative">
      <summary
        className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground [&::-webkit-details-marker]:hidden"
        aria-label="Account menu"
      >
        {name.slice(0, 1).toUpperCase()}
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border bg-card p-2 shadow-lift">
        <div className="border-b px-3 py-2.5">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <Link href="/dashboard/settings" className="mt-1 block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-accent">
          Account settings
        </Link>
        <Link href="/events" className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-accent">
          Public site
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={pending}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </button>
      </div>
    </details>
  );
}
