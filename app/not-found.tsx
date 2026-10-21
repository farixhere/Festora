import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-3 font-display text-2xl font-bold">We couldn't find that page</h1>
      <p className="mt-2 text-muted-foreground">It may have been moved, unpublished, or never existed.</p>
      <div className="mt-6 flex gap-2">
        <Link href="/events" className={buttonVariants({})}>Browse events</Link>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>Home</Link>
      </div>
    </main>
  );
}
