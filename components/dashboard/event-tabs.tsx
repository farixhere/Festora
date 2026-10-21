"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { slug: "", label: "Overview" },
  { slug: "/programs", label: "Programs" },
  { slug: "/schedule", label: "Schedule" },
  { slug: "/registrations", label: "Registrations" },
  { slug: "/announcements", label: "Announcements" },
];

/** Scrollable tab bar so five tabs fit on small phones without wrapping. */
export function EventTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/events/${eventId}`;
  return (
    <nav aria-label="Event sections" className="-mx-4 mb-6 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {TABS.map((t) => {
          const href = `${base}${t.slug}`;
          const active = t.slug === "" ? pathname === base : pathname.startsWith(href);
          return (
            <li key={t.slug}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-block border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
