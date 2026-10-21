import Link from "next/link";
import { CalendarDays, ChevronLeft, Globe, Mail, MapPin, Megaphone, Users, Video } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { EventCover } from "@/components/events/event-cover";
import { ProgramList, ScheduleTimeline } from "@/components/events/schedule-timeline";
import { RegistrationForm } from "@/features/registrations/registration-form";
import { registrationWindow } from "@/features/registrations/policy";
import type { PublicEventDetail } from "@/features/events/queries";
import { formatDate, formatDateTime, formatEventRange } from "@/lib/utils/dates";
import { siteUrl } from "@/lib/site";

export function PublicEventView({
  data,
  user,
  preview = false,
}: {
  data: PublicEventDetail;
  user: { name: string; email: string } | null;
  /** Organizer preview: shows the page exactly as published, minus the live form. */
  preview?: boolean;
}) {
  const { event, orgName, seatsTaken, programs, schedule, announcements } = data;
  const regState = registrationWindow(event);
  const full = event.capacity !== null && seatsTaken >= event.capacity;
  const seatsLeft = event.capacity !== null ? Math.max(0, event.capacity - seatsTaken) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.shortDescription,
    startDate: event.startsAt.toISOString(),
    endDate: event.endsAt.toISOString(),
    eventAttendanceMode:
      event.mode === "online"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : event.mode === "hybrid"
          ? "https://schema.org/MixedEventAttendanceMode"
          : "https://schema.org/OfflineEventAttendanceMode",
    location:
      event.mode === "online"
        ? { "@type": "VirtualLocation", url: `${siteUrl()}/events/${event.slug}` }
        : { "@type": "Place", name: event.venue, address: event.city },
    organizer: { "@type": "Organization", name: orgName },
    url: `${siteUrl()}/events/${event.slug}`,
  };

  const where =
    event.mode === "online"
      ? "Online event"
      : [event.venue, event.city].filter(Boolean).join(", ");

  return (
    <article className="container py-8">
      <script
        type="application/ld+json"
        // "<" is escaped so event text can never close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      {preview && (
        <div role="status" className="mb-5 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm font-semibold text-warning">
          Preview — only your team can see this. Status: {event.status}.
        </div>
      )}
      <Link
        href={preview ? `/dashboard/events/${event.id}` : "/events"}
        className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden /> {preview ? "Back to editor" : "All events"}
      </Link>

      <div className="aspect-[5/2] overflow-hidden rounded-3xl shadow-lift sm:aspect-[3/1]">
        <EventCover value={event.coverImage} seed={event.slug} />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-10">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">{event.category}</Badge>
              <Badge>{event.mode === "in_person" ? "In person" : event.mode === "online" ? "Online" : "Hybrid"}</Badge>
              {event.visibility === "unlisted" && <Badge tone="warning">Private link</Badge>}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">{event.title}</h1>
            <p className="mt-2 text-sm font-semibold text-primary">Hosted by {orgName}</p>
            <p className="mt-4 text-lg text-muted-foreground">{event.shortDescription}</p>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">When</dt>
                  <dd className="mt-0.5 text-sm font-semibold">{formatEventRange(event.startsAt, event.endsAt, event.timezone)}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
                {event.mode === "online" ? (
                  <Video className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                ) : (
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                )}
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Where</dt>
                  <dd className="mt-0.5 text-sm font-semibold">{where || "To be announced"}</dd>
                </div>
              </div>
            </dl>
          </header>

          {event.description && (
            <section aria-labelledby="about">
              <h2 id="about" className="text-xl font-extrabold">About this event</h2>
              {/* React escapes text; whitespace is preserved for paragraphs. */}
              <p className="mt-3 whitespace-pre-line leading-relaxed text-foreground/90">{event.description}</p>
            </section>
          )}

          {announcements.length > 0 && (
            <section aria-labelledby="updates">
              <h2 id="updates" className="flex items-center gap-2 text-xl font-extrabold">
                <Megaphone className="h-5 w-5 text-coral" aria-hidden /> Announcements
              </h2>
              <ul className="mt-4 space-y-3">
                {announcements.map((a) => (
                  <li key={a.id} className="rounded-xl border border-coral/30 bg-coral/5 p-4">
                    <p className="font-bold">{a.title}</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{a.body}</p>
                    {a.publishedAt && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDateTime(a.publishedAt, event.timezone)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {event.schedulePublished && programs.length > 0 && (
            <section aria-labelledby="programs">
              <h2 id="programs" className="text-xl font-extrabold">Programs</h2>
              <div className="mt-4">
                <ProgramList programs={programs} timezone={event.timezone} />
              </div>
            </section>
          )}

          {event.schedulePublished && schedule.length > 0 && (
            <section aria-labelledby="schedule">
              <h2 id="schedule" className="text-xl font-extrabold">Schedule</h2>
              <div className="mt-5">
                <ScheduleTimeline items={schedule} programs={programs} timezone={event.timezone} />
              </div>
            </section>
          )}

          <section aria-labelledby="organizer">
            <h2 id="organizer" className="text-xl font-extrabold">Organizer</h2>
            <Card className="mt-4 flex flex-wrap items-center gap-4 p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-lg font-extrabold text-accent-foreground">
                {event.organizerName.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="font-bold">{event.organizerName}</p>
                <p className="text-sm text-muted-foreground">{orgName}</p>
              </div>
              {event.organizerEmail && (
                <a
                  href={`mailto:${event.organizerEmail}`}
                  className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" aria-hidden /> Contact
                </a>
              )}
            </Card>
          </section>
        </div>

        {/* Registration */}
        <aside className="lg:sticky lg:top-24 lg:self-start" aria-labelledby="register-title">
          <Card className="p-6">
            <h2 id="register-title" className="text-xl font-extrabold">Register</h2>

            {event.capacity !== null && (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden /> {seatsTaken} / {event.capacity} registered</span>
                  <span>{full ? "Full" : `${seatsLeft} left`}</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={event.capacity}
                  aria-valuenow={Math.min(seatsTaken, event.capacity)}
                  aria-label="Registration capacity"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-coral"
                    style={{ width: `${Math.min(100, (seatsTaken / event.capacity) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-5">
              {preview ? (
                <div className="rounded-xl bg-muted p-4 text-sm" role="status">
                  <p className="font-bold">The registration form appears here</p>
                  <p className="mt-1 text-muted-foreground">Visitors can register once the event is published and registration is open.</p>
                </div>
              ) : regState === "open" && !full ? (
                <RegistrationForm
                  slug={event.slug}
                  requiresApproval={event.requiresApproval}
                  defaultName={user?.name}
                  defaultEmail={user?.email}
                />
              ) : (
                <div className="rounded-xl bg-muted p-4 text-sm" role="status">
                  <p className="font-bold">
                    {regState === "open" && full
                      ? "This event is full"
                      : regState === "not_started"
                        ? "Registration hasn't opened yet"
                        : regState === "ended"
                          ? "This event has ended"
                          : regState === "closed"
                            ? "Registration has closed"
                            : "Registration isn't open for this event"}
                  </p>
                  {regState === "not_started" && event.registrationOpensAt && (
                    <p className="mt-1 text-muted-foreground">
                      Opens {formatDateTime(event.registrationOpensAt, event.timezone)}.
                    </p>
                  )}
                </div>
              )}
            </div>

            {regState === "open" && event.registrationClosesAt && !full && (
              <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe className="h-3.5 w-3.5" aria-hidden />
                Registration closes {formatDate(event.registrationClosesAt, event.timezone, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              </p>
            )}
          </Card>
        </aside>
      </div>
    </article>
  );
}
