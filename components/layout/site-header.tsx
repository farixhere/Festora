import Link from "next/link";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/providers";
import { getSession } from "@/lib/auth/session";

const NAV = [
  { href: "/events", label: "Explore events" },
  { href: "/#capabilities", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
];

/** Server component: reads the session so the right buttons render on first paint. */
export async function SiteHeader() {
  const session = await getSession().catch(() => null);
  const signedIn = Boolean(session);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Festora home" className="rounded-lg">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {signedIn ? (
            <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={buttonVariants({ variant: "ghost", size: "sm" }) + " hidden sm:inline-flex"}
              >
                Sign in
              </Link>
              <Link href="/sign-up" className={buttonVariants({ size: "sm" })}>
                Get started
              </Link>
            </>
          )}
          {/* No-JS mobile menu */}
          <details className="relative md:hidden">
            <summary
              className={buttonVariants({ variant: "ghost", size: "icon" }) + " cursor-pointer list-none [&::-webkit-details-marker]:hidden"}
              aria-label="Open menu"
            >
              <Menu aria-hidden />
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border bg-card p-2 shadow-lift">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-accent"
                >
                  {n.label}
                </Link>
              ))}
              {!signedIn && (
                <Link href="/sign-in" className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-accent">
                  Sign in
                </Link>
              )}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
