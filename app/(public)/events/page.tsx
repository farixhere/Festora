import type { Metadata } from "next";
import Link from "next/link";
import { CalendarSearch, Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState, Pagination } from "@/components/ui/primitives";
import { EventCard } from "@/components/events/event-card";
import { EVENT_CATEGORIES } from "@/lib/constants";
import { listPublicCities, listPublicEvents } from "@/features/events/queries";
import { buildQuery, firstParam, pageParam } from "@/lib/utils/query";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore events",
  description: "Discover upcoming fests, workshops, competitions and community events.",
};

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function EventsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (firstParam(sp.q) ?? "").trim().slice(0, 100);
  const category = firstParam(sp.category) ?? "";
  const city = firstParam(sp.city) ?? "";
  const sort = firstParam(sp.sort) === "latest" ? "latest" : "soonest";
  const page = pageParam(sp.page);

  let result: Awaited<ReturnType<typeof listPublicEvents>> | null = null;
  let cities: string[] = [];
  let failed = false;
  try {
    [result, cities] = await Promise.all([
      listPublicEvents({
        q,
        category: (EVENT_CATEGORIES as readonly string[]).includes(category) ? category : undefined,
        city: city || undefined,
        sort,
        page,
      }),
      listPublicCities(),
    ]);
  } catch (err) {
    console.error("events page query failed", err);
    failed = true;
  }

  const hasFilters = Boolean(q || category || city);
  const base = { q, category, city, sort: sort === "latest" ? "latest" : undefined };

  return (
    <div className="container py-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Explore events</h1>
        <p className="mt-2 text-muted-foreground">
          Upcoming fests, workshops, competitions and meetups — open for registration.
        </p>
      </div>

      <form
        action="/events"
        method="get"
        role="search"
        className="mb-8 grid gap-3 rounded-2xl border bg-card p-4 shadow-card sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto]"
      >
        <div className="relative">
          <label htmlFor="q" className="sr-only">Search events</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="q" name="q" defaultValue={q} placeholder="Search by title or city" className="pl-10" maxLength={100} />
        </div>
        <div>
          <label htmlFor="category" className="sr-only">Category</label>
          <Select id="category" name="category" defaultValue={category}>
            <option value="">All categories</option>
            {EVENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="city" className="sr-only">Location</label>
          <Select id="city" name="city" defaultValue={city}>
            <option value="">Any location</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="sort" className="sr-only">Sort by</label>
          <Select id="sort" name="sort" defaultValue={sort}>
            <option value="soonest">Soonest first</option>
            <option value="latest">Recently added</option>
          </Select>
        </div>
        <Button type="submit">Search</Button>
      </form>

      {failed ? (
        <EmptyState
          icon={<CalendarSearch />}
          title="We couldn't load events"
          description="Something went wrong on our side. Please refresh in a moment."
          action={<Link href="/events" className={buttonVariants({ variant: "outline" })}>Try again</Link>}
        />
      ) : result && result.items.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
            {result.total} event{result.total === 1 ? "" : "s"} found
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((d) => (
              <EventCard key={d.event.id} data={d} />
            ))}
          </div>
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            hrefFor={(p) => `/events${buildQuery({ ...base, page: p > 1 ? p : undefined })}`}
          />
        </>
      ) : (
        <EmptyState
          icon={<CalendarSearch />}
          title={hasFilters ? "No events match your search" : "No upcoming events yet"}
          description={
            hasFilters
              ? "Try a different keyword, or clear the filters to see everything that's on."
              : "Check back soon — organizers are busy planning."
          }
          action={
            hasFilters ? (
              <Link href="/events" className={buttonVariants({ variant: "outline" })}>
                Clear filters
              </Link>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
