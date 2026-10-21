import { Clock, MapPin, Mic2 } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { formatDate, formatTime, zonedDayKey } from "@/lib/utils/dates";
import type { Program, ScheduleItem } from "@/lib/db/schema";

type Props = {
  items: ScheduleItem[];
  programs: Program[];
  timezone: string;
};

/** Chronological schedule grouped by day, shown in the event's timezone. */
export function ScheduleTimeline({ items, programs, timezone }: Props) {
  const programById = new Map(programs.map((p) => [p.id, p]));
  const days = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const key = zonedDayKey(item.startsAt, timezone);
    const list = days.get(key) ?? [];
    list.push(item);
    days.set(key, list);
  }

  return (
    <div className="space-y-8">
      {[...days.entries()].map(([key, list]) => (
        <section key={key} aria-label={key}>
          <h3 className="mb-4 font-display text-base font-extrabold text-primary">
            {formatDate(list[0]!.startsAt, timezone, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>
          <ol className="relative space-y-4 border-l-2 border-primary/20 pl-6">
            {list.map((item) => {
              const program = item.programId ? programById.get(item.programId) : undefined;
              return (
                <li key={item.id} className="relative">
                  <span
                    className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background"
                    aria-hidden
                  />
                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-primary">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                        {formatTime(item.startsAt, timezone)} – {formatTime(item.endsAt, timezone)}
                      </span>
                      {program && (
                        <Badge tone="primary">{program.title}</Badge>
                      )}
                    </div>
                    <h4 className="mt-1.5 text-base font-bold">{item.title}</h4>
                    {item.description && (
                      <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    {(item.stage || item.speaker) && (
                      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {item.stage && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" aria-hidden /> {item.stage}
                          </span>
                        )}
                        {item.speaker && (
                          <span className="inline-flex items-center gap-1">
                            <Mic2 className="h-3.5 w-3.5" aria-hidden /> {item.speaker}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** Program overview cards (name, time window, venue). */
export function ProgramList({
  programs,
  timezone,
}: {
  programs: Program[];
  timezone: string;
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {programs.map((p) => (
        <li key={p.id} className="rounded-xl border bg-card p-4 shadow-sm">
          {p.label && <Badge tone="primary">{p.label}</Badge>}
          <h4 className="mt-1.5 text-base font-bold">{p.title}</h4>
          <p className="mt-1 text-xs font-semibold text-primary">
            {formatDate(p.startsAt, timezone, { weekday: "short", day: "numeric", month: "short" })} ·{" "}
            {formatTime(p.startsAt, timezone)} – {formatTime(p.endsAt, timezone)}
          </p>
          {p.description && (
            <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">{p.description}</p>
          )}
          {p.venue && (
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden /> {p.venue}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
