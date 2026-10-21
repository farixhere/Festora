import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const COLUMNS = [
  {
    title: "Participants",
    links: [
      { href: "/events", label: "Explore events" },
      { href: "/my-registrations", label: "My registrations" },
    ],
  },
  {
    title: "Organizers",
    links: [
      { href: "/sign-up", label: "Create an account" },
      { href: "/sign-in", label: "Sign in" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "Product",
    links: [
      { href: "/#capabilities", label: "Features" },
      { href: "/#how-it-works", label: "How it works" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-card/50">
      <div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Event management for college fests, clubs and communities — from first idea to packed room.
          </p>
        </div>
        {COLUMNS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="font-display text-sm font-bold">{c.title}</h2>
            <ul className="mt-3 space-y-2">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t py-5">
        <p className="container text-xs text-muted-foreground">
          © {new Date().getFullYear()} Festora. Built for the people who make events happen.
        </p>
      </div>
    </footer>
  );
}
