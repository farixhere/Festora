import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Circle,
  FileEdit,
  Megaphone,
  Rocket,
  Ticket,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  EventStatusBadge,
  PageHeader,
  RegistrationStatusBadge,
  StatCard,
} from "@/components/ui/primitives";
import { LocalTime } from "@/components/ui/local-time";
import { EventsBarChart, RegistrationsAreaChart } from "@/components/dashboard/charts";
import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { getDashboardData } from "@/features/dashboard/queries";
import { formatDate, formatTime } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Overview" };

const CHECKLIST = [
  "Create your first event",
  "Add programs and a schedule",
  "Publish it so people can register",
  "Share the link and approve registrations",
];

export default async function DashboardPage() {
  const { user, org, role } = await requireOrgContext();
  const data = await getDashboardData(org.id);
  const { totals } = data;
  const canCreate = can(role, "event.create");
  const hasRegistrations = data.registrationsByDay.some((d) => d.count > 0);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description={`Here's what's happening at ${org.name}.`}
        actions={
          canCreate && (
            <Link href="/dashboard/events/new" className={buttonVariants()}>
              <CalendarPlus aria-hidden /> New event
            </Link>
          )
        }
      />

      {totals.events === 0 ? (
        <Card className="mb-6 overflow-hidden">
          <div className="grid gap-0 md:grid-cols-[1.2fr_1fr]">
            <div className="p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Rocket className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="mt-4 text-2xl font-extrabold">Let&apos;s run your first event</h2>
              <p className="mt-1.5 text-muted-foreground">
                Your dashboard fills with live numbers as soon as you create an event and people start registering.
              </p>
              {canCreate ? (
                <Link href="/dashboard/events/new" className={buttonVariants({ className: "mt-5" })}>
                  Create an event
                </Link>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Ask an organizer or admin to create the first event.</p>
              )}
            </div>
            <ol className="space-y-3 bg-accent/50 p-7">
              {CHECKLIST.map((item, i) => (
                <li key={item} className="flex items-center gap-3 text-sm font-semibold">
                  {i === 0 ? (
                    <Circle className="h-5 w-5 text-primary" aria-hidden />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/50" aria-hidden />
                  )}
                  {item}
                </li>
              ))}
            </ol>
          </div>
        </Card>
      ) : null}

      <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total events" value={totals.events} hint={totals.archived ? `${totals.archived} archived` : undefined} icon={<CalendarDays />} />
        <StatCard label="Published" value={totals.published} hint="Live on the public site" icon={<CheckCircle2 />} />
        <StatCard label="Drafts" value={totals.drafts} hint="Not yet public" icon={<FileEdit />} />
        <StatCard
          label="Registrations"
          value={totals.registrations}
          hint={totals.pending ? `${totals.pending} awaiting review` : `${totals.confirmed} confirmed`}
          icon={<Ticket />}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Registrations, last 14 days</CardTitle>
            <CardDescription>New sign-ups across all your events.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasRegistrations ? (
              <RegistrationsAreaChart data={data.registrationsByDay} />
            ) : (
              <p className="flex h-64 items-center justify-center rounded-xl bg-muted/50 px-6 text-center text-sm text-muted-foreground">
                No registrations in the last 14 days yet. Once people register, the trend appears here.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Registrations by event</CardTitle>
            <CardDescription>Active registrations (pending + confirmed).</CardDescription>
          </CardHeader>
          <CardContent>
            {data.registrationsByEvent.length > 0 ? (
              <EventsBarChart data={data.registrationsByEvent} />
            ) : (
              <p className="flex h-64 items-center justify-center rounded-xl bg-muted/50 px-6 text-center text-sm text-muted-foreground">
                Nothing to compare yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Upcoming events</CardTitle>
            <Link href="/dashboard/events" className="text-sm font-semibold text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {data.upcoming.length === 0 ? (
              <EmptyState
                className="border-0 bg-transparent py-8"
                icon={<CalendarDays />}
                title="No upcoming published events"
                description="Publish an event to see it here."
              />
            ) : (
              <ul className="divide-y">
                {data.upcoming.map(({ event, seatsTaken }) => (
                  <li key={event.id}>
                    <Link href={`/dashboard/events/${event.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-primary">
                      <div className="min-w-0">
                        <p className="truncate font-bold">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(event.startsAt, event.timezone, { day: "numeric", month: "short" })} · {formatTime(event.startsAt, event.timezone)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                        {seatsTaken}{event.capacity ? ` / ${event.capacity}` : ""} registered
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent registrations</CardTitle>
            <Link href="/dashboard/participants" className="text-sm font-semibold text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {data.recentRegistrations.length === 0 ? (
              <EmptyState
                className="border-0 bg-transparent py-8"
                icon={<Users />}
                title="No registrations yet"
                description="New registrations show up here as they arrive."
              />
            ) : (
              <ul className="divide-y">
                {data.recentRegistrations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{r.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.eventTitle} · <LocalTime iso={r.createdAt.toISOString()} style="relative" />
                      </p>
                    </div>
                    <RegistrationStatusBadge status={r.status as "pending" | "confirmed" | "rejected" | "cancelled"} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto]">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>An audit trail of what your team has done.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.activity.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Activity appears here as your team works.</p>
            ) : (
              <ul className="space-y-3">
                {data.activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                    <p className="min-w-0">
                      <span className="font-semibold">{a.actorName ?? "Someone"}</span>{" "}
                      <span className="text-muted-foreground">— {a.summary}</span>{" "}
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        (<LocalTime iso={a.createdAt.toISOString()} style="relative" />)
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="p-5 lg:w-72">
          <CardTitle>Quick actions</CardTitle>
          <div className="mt-4 flex flex-col gap-2">
            {canCreate && (
              <Link href="/dashboard/events/new" className={buttonVariants({ variant: "secondary", className: "justify-start" })}>
                <CalendarPlus aria-hidden /> Create event
              </Link>
            )}
            <Link href="/dashboard/participants?status=pending" className={buttonVariants({ variant: "secondary", className: "justify-start" })}>
              <Users aria-hidden /> Review pending ({totals.pending})
            </Link>
            <Link href="/dashboard/announcements" className={buttonVariants({ variant: "secondary", className: "justify-start" })}>
              <Megaphone aria-hidden /> Post announcement
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
