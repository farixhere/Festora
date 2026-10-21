import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock, MapPin, Video, XCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, RegistrationStatusBadge } from "@/components/ui/primitives";
import { CancelRegistrationButton } from "@/features/registrations/cancel-button";
import { canTransition } from "@/features/registrations/policy";
import { getRegistrationByCode } from "@/features/registrations/queries";
import { formatEventRange } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

// A private, unguessable link: never indexed or cached.
export const metadata: Metadata = {
  title: "Your registration",
  robots: { index: false, follow: false },
};

const COPY = {
  confirmed: {
    icon: CheckCircle2,
    tone: "text-success",
    title: "You're registered!",
    text: "Your spot is confirmed. Keep this page handy — it's your proof of registration.",
  },
  pending: {
    icon: Clock,
    tone: "text-warning",
    title: "Request received",
    text: "The organizers are reviewing your registration. Check back on this page for the decision.",
  },
  rejected: {
    icon: XCircle,
    tone: "text-destructive",
    title: "Registration not approved",
    text: "The organizers couldn't approve this registration. You can contact them from the event page.",
  },
  cancelled: {
    icon: XCircle,
    tone: "text-muted-foreground",
    title: "Registration cancelled",
    text: "This registration was cancelled and the seat has been released.",
  },
} as const;

export default async function RegistrationPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (!/^FST-[A-Za-z0-9_-]{8,40}$/.test(code)) notFound();
  const row = await getRegistrationByCode(code);
  if (!row) notFound();

  const { reg } = row;
  const copy = COPY[reg.status];
  const Icon = copy.icon;
  const canCancel = canTransition(reg.status, "cancelled") && row.endsAt.getTime() > Date.now();

  return (
    <div className="container max-w-2xl py-12">
      <Card className="overflow-hidden">
        <div className="border-b bg-accent/50 p-8 text-center">
          <Icon className={`mx-auto h-14 w-14 ${copy.tone}`} aria-hidden />
          <h1 className="mt-4 text-3xl font-extrabold">{copy.title}</h1>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">{copy.text}</p>
          <div className="mt-4">
            <RegistrationStatusBadge status={reg.status} />
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Event</p>
            <Link href={`/events/${row.slug}`} className="mt-1 block text-xl font-extrabold hover:text-primary">
              {row.title}
            </Link>
          </div>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="flex gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <dt className="font-semibold">When</dt>
                <dd className="text-muted-foreground">{formatEventRange(row.startsAt, row.endsAt, row.timezone)}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              {row.mode === "online" ? (
                <Video className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              ) : (
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              )}
              <div>
                <dt className="font-semibold">Where</dt>
                <dd className="text-muted-foreground">
                  {row.mode === "online"
                    ? reg.status === "confirmed" && row.onlineUrl
                      ? (
                        <a href={row.onlineUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                          Join link
                        </a>
                      )
                      : "Online"
                    : [row.venue, row.city].filter(Boolean).join(", ") || "To be announced"}
                </dd>
              </div>
            </div>
          </dl>

          <div className="rounded-xl bg-muted p-4 text-sm">
            <p><span className="font-semibold">Name:</span> {reg.fullName}</p>
            <p className="mt-1"><span className="font-semibold">Email:</span> {reg.email}</p>
            <p className="mt-1">
              <span className="font-semibold">Reference:</span>{" "}
              <span className="font-mono">{reg.code}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={`/events/${row.slug}`} className={buttonVariants({ variant: "outline" })}>
              View event
            </Link>
            {canCancel && <CancelRegistrationButton code={reg.code} />}
          </div>
        </div>
      </Card>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Anyone with this link can view this registration, so keep it private.
      </p>
    </div>
  );
}
