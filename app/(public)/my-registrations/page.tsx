import type { Metadata } from "next";
import Link from "next/link";
import { Ticket } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, EmptyState, RegistrationStatusBadge } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth/session";
import { listUserRegistrations } from "@/features/registrations/queries";
import { formatDateTime } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My registrations", robots: { index: false } };

export default async function MyRegistrationsPage() {
  const user = await requireUser("/my-registrations");
  const rows = await listUserRegistrations(user.id);

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-extrabold">My registrations</h1>
      <p className="mt-1 text-muted-foreground">
        Events you registered for while signed in.
      </p>
      <div className="mt-8 space-y-3">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Ticket />}
            title="No registrations yet"
            description="When you register for an event while signed in, it appears here."
            action={<Link href="/events" className={buttonVariants()}>Explore events</Link>}
          />
        ) : (
          rows.map((r) => (
            <Card key={r.reg.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <Link href={`/registrations/${r.reg.code}`} className="block truncate font-bold hover:text-primary">
                  {r.title}
                </Link>
                <p className="text-sm text-muted-foreground">{formatDateTime(r.startsAt, r.timezone)}</p>
              </div>
              <RegistrationStatusBadge status={r.reg.status} />
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
