import Link from "next/link";
import { CalendarDays, MapPin, Users, Video } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { EventCover } from "@/components/events/event-cover";
import { formatDate, formatTime } from "@/lib/utils/dates";
import type { PublicEventCardData } from "@/features/events/queries";

export function EventCard({ data }: { data: PublicEventCardData }) {
  const { event, orgName, seatsTaken } = data;
  const seatsLeft = event.capacity !== null ? Math.max(0, event.capacity - seatsTaken) : null;
  const where =
    event.mode === "online"
      ? "Online"
      : [event.venue, event.city].filter(Boolean).join(", ") || "Venue to be announced";

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lift focus-visible:-translate-y-1"
    >
      <div className="relative aspect-[5/2] overflow-hidden">
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
          <EventCover value={event.coverImage} seed={event.slug} />
        </div>
        <Badge className="absolute left-3 top-3 bg-card/90 text-foreground backdrop-blur">
          {event.category}
        </Badge>
        {seatsLeft !== null && seatsLeft <= 10 && (
          <Badge tone={seatsLeft === 0 ? "danger" : "warning"} className="absolute right-3 top-3 bg-card/90 backdrop-blur">
            {seatsLeft === 0 ? "Full" : `${seatsLeft} left`}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{orgName}</p>
        <h3 className="mt-1 line-clamp-2 text-lg font-extrabold leading-snug group-hover:text-primary">
          {event.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{event.shortDescription}</p>
        <dl className="mt-4 space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <dt className="sr-only">When</dt>
            <dd>
              {formatDate(event.startsAt, event.timezone, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
              {formatTime(event.startsAt, event.timezone)}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            {event.mode === "online" ? (
              <Video className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            ) : (
              <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            )}
            <dt className="sr-only">Where</dt>
            <dd className="line-clamp-1">{where}</dd>
          </div>
          {event.capacity !== null && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <dt className="sr-only">Capacity</dt>
              <dd>
                {seatsTaken} / {event.capacity} registered
              </dd>
            </div>
          )}
        </dl>
      </div>
    </Link>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card" aria-hidden>
      <div className="skeleton aspect-[5/2] rounded-none" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-5 w-4/5" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
      </div>
    </div>
  );
}
