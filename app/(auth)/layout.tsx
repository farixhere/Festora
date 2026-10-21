import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/providers";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="grain absolute inset-0 -z-10 opacity-60" aria-hidden />
      <header className="container flex h-16 items-center justify-between">
        <Link href="/" aria-label="Festora home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main id="main" className="container flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-md animate-page-in">{children}</div>
      </main>
    </div>
  );
}
