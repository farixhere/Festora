import { EventCardSkeleton } from "@/components/events/event-card";

export default function Loading() {
  return (
    <div className="container py-10" aria-busy="true" aria-label="Loading events">
      <div className="skeleton mb-3 h-9 w-64" />
      <div className="skeleton mb-8 h-5 w-96 max-w-full" />
      <div className="skeleton mb-8 h-24 w-full rounded-2xl" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
