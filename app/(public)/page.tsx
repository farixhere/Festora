import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarPlus,
  GraduationCap,
  ListChecks,
  Megaphone,
  Rocket,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  CalendarDays,
  Download,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/primitives";
import { EventCard } from "@/components/events/event-card";
import { EventCover } from "@/components/events/event-cover";
import { getFeaturedEvents } from "@/features/events/queries";
import type { PublicEventCardData } from "@/features/events/queries";

export const dynamic = "force-dynamic";

const CAPABILITIES = [
  {
    icon: CalendarPlus,
    title: "Events, drafted and published",
    text: "Build an event as a draft, preview the public page, then publish or unpublish whenever you're ready.",
  },
  {
    icon: ListChecks,
    title: "Programs & schedules",
    text: "Break a fest into programs and sessions with stages, speakers and times shown in the event's own timezone.",
  },
  {
    icon: Ticket,
    title: "Registrations that never overbook",
    text: "Deadlines and capacity are enforced on the server, even when hundreds of people register at once.",
  },
  {
    icon: Users,
    title: "Participant management",
    text: "Search, filter, approve or reject applications, update details and export a clean CSV.",
  },
  {
    icon: Megaphone,
    title: "Announcements",
    text: "Post updates on the event page the moment plans change. Nobody has to dig through group chats.",
  },
  {
    icon: ShieldCheck,
    title: "Teams, roles & privacy",
    text: "Owners, admins, organizers and viewers — each organization's data stays strictly its own.",
  },
];

const STEPS = [
  { n: "01", title: "Create", text: "Set the basics: title, dates, venue, capacity and registration window." },
  { n: "02", title: "Schedule", text: "Add programs and sessions so participants know exactly what's on." },
  { n: "03", title: "Publish", text: "Go live with a shareable page that looks great on any phone." },
  { n: "04", title: "Run it", text: "Approve registrations, post announcements and watch the numbers move." },
];

async function loadFeatured(): Promise<PublicEventCardData[]> {
  try {
    return await getFeaturedEvents(3);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const featured = await loadFeatured();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grain absolute inset-0 -z-10 opacity-70" aria-hidden />
        <div
          className="absolute -right-24 -top-24 -z-10 h-[28rem] w-[28rem] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent 70%)" }}
          aria-hidden
        />
        <div className="container grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-coral" aria-hidden />
              Built for college fests, clubs & communities
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] sm:text-6xl">
              Plan it. Publish it.{" "}
              <span className="bg-gradient-to-r from-primary to-coral bg-clip-text text-transparent">
                Pack the room.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Festora gives organizers one calm place to create events, publish schedules, take
              registrations and keep everyone in the loop — no spreadsheets, no scattered forms.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
                Start organizing <ArrowRight aria-hidden />
              </Link>
              <Link href="/events" className={buttonVariants({ size: "lg", variant: "outline" })}>
                Explore events
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Free to start · Works beautifully on your phone
            </p>
          </div>

          {/* Illustrative sample (not live data) */}
          <div className="relative mx-auto w-full max-w-md animate-fade-up [animation-delay:120ms]" aria-hidden>
            <div className="absolute -left-4 top-10 h-40 w-3/4 -rotate-6 overflow-hidden rounded-3xl shadow-lift">
              <EventCover value="art:coral-waves" seed="a" />
            </div>
            <div className="relative ml-auto w-[88%] rotate-2 overflow-hidden rounded-3xl border bg-card shadow-lift">
              <div className="h-40">
                <EventCover value="art:violet-burst" seed="b" />
              </div>
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Sample event</p>
                <p className="mt-1 font-display text-xl font-extrabold">Spring Cultural Fest</p>
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4 text-primary" /> Saturday · 10:00 am
                </div>
                <div className="mt-4 flex gap-2">
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                    Registration open
                  </span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">Free entry</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured events */}
      <section className="container py-12" aria-labelledby="featured-title">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="featured-title" className="text-2xl font-extrabold sm:text-3xl">
              Happening soon
            </h2>
            <p className="mt-1 text-muted-foreground">Fresh from organizers on Festora.</p>
          </div>
          <Link href="/events" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            See all events <ArrowRight aria-hidden />
          </Link>
        </div>
        {featured.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((d) => (
              <EventCard key={d.event.id} data={d} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CalendarDays />}
            title="No public events yet"
            description="Published events show up here. Be the first organizer to put one on the map."
            action={
              <Link href="/sign-up" className={buttonVariants()}>
                Create your first event
              </Link>
            }
          />
        )}
      </section>

      {/* Two audiences */}
      <section className="container py-12" aria-labelledby="audiences-title">
        <h2 id="audiences-title" className="sr-only">
          For organizers and participants
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="relative overflow-hidden p-7">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Building2 className="h-6 w-6" aria-hidden />
            </span>
            <h3 className="mt-5 text-2xl font-extrabold">For organizers</h3>
            <p className="mt-2 text-muted-foreground">
              Create an organization, invite your committee, and run every event from one dashboard —
              with roles so the right people can do the right things.
            </p>
            <Link href="/sign-up" className={buttonVariants({ className: "mt-6" })}>
              Create an organizer account
            </Link>
          </Card>
          <Card className="relative overflow-hidden p-7">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral text-coral-foreground">
              <GraduationCap className="h-6 w-6" aria-hidden />
            </span>
            <h3 className="mt-5 text-2xl font-extrabold">For participants</h3>
            <p className="mt-2 text-muted-foreground">
              Browse what&apos;s on, check the schedule and register in under a minute — no account
              needed. You&apos;ll get a private link to track your status.
            </p>
            <Link href="/events" className={buttonVariants({ variant: "outline", className: "mt-6" })}>
              Browse events
            </Link>
          </Card>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="container scroll-mt-24 py-12" aria-labelledby="cap-title">
        <div className="mb-10 max-w-2xl">
          <h2 id="cap-title" className="text-2xl font-extrabold sm:text-3xl">
            Everything an event team actually needs
          </h2>
          <p className="mt-2 text-muted-foreground">
            Practical tools for real events — focused on the work, not on gimmicks.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <Card key={c.title} className="p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <c.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-bold">{c.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="how-it-works" className="container scroll-mt-24 py-12" aria-labelledby="how-title">
        <h2 id="how-title" className="text-2xl font-extrabold sm:text-3xl">
          From idea to packed room in four steps
        </h2>
        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-2xl border bg-card p-6 shadow-card">
              <span className="font-display text-4xl font-extrabold text-primary/30">{s.n}</span>
              <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Benefits + CTA */}
      <section className="container py-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2b1166] via-[#5b21b6] to-[#ea580c] p-8 text-white shadow-lift sm:p-14">
          <div className="grain absolute inset-0 opacity-40" aria-hidden />
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-extrabold sm:text-4xl">
                Less chasing. More celebrating.
              </h2>
              <ul className="mt-5 space-y-2.5 text-white/90">
                <li className="flex gap-2.5"><Rocket className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> Launch a registration page in minutes, not days.</li>
                <li className="flex gap-2.5"><Users className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> Hand a committee the right level of access — and nothing more.</li>
                <li className="flex gap-2.5"><Download className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> Export attendee lists for gate check-in whenever you need them.</li>
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/sign-up" className={buttonVariants({ size: "lg", className: "bg-white text-[#2b1166] hover:bg-white/90" })}>
                Create your free account
              </Link>
              <Link href="/events" className={buttonVariants({ size: "lg", variant: "ghost", className: "text-white hover:bg-white/15 hover:text-white" })}>
                See what&apos;s on
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
