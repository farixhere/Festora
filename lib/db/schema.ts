import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });

/* ─────────────────────────────────────────────────────────────
 * Authentication tables (Better Auth). Column names are snake_case in
 * the database; the TypeScript keys match what Better Auth expects.
 * ───────────────────────────────────────────────────────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: ts("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: ts("access_token_expires_at"),
    refreshTokenExpiresAt: ts("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: ts("expires_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/**
 * Shared rate-limit counters. Used by Better Auth (database storage) and by
 * Festora's own limiter (keys prefixed with "festora:").
 */
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/* ─────────────────────────────────────────────────────────────
 * Enums
 * ───────────────────────────────────────────────────────────── */

export const memberRole = pgEnum("member_role", [
  "owner",
  "admin",
  "organizer",
  "viewer",
]);
export const eventStatus = pgEnum("event_status", [
  "draft",
  "published",
  "archived",
]);
export const eventVisibility = pgEnum("event_visibility", [
  "public",
  "unlisted",
]);
export const eventMode = pgEnum("event_mode", [
  "in_person",
  "online",
  "hybrid",
]);
export const registrationStatus = pgEnum("registration_status", [
  "pending",
  "confirmed",
  "rejected",
  "cancelled",
]);
export const announcementStatus = pgEnum("announcement_status", [
  "draft",
  "published",
]);

/* ─────────────────────────────────────────────────────────────
 * Organizations
 * ───────────────────────────────────────────────────────────── */

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  website: text("website"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull().default("organizer"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("organization_members_org_user_uq").on(t.organizationId, t.userId),
    index("organization_members_user_idx").on(t.userId),
  ],
);

/* ─────────────────────────────────────────────────────────────
 * Events
 * ───────────────────────────────────────────────────────────── */

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    shortDescription: text("short_description").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull(),
    coverImage: text("cover_image"),
    mode: eventMode("mode").notNull().default("in_person"),
    venue: text("venue").notNull().default(""),
    city: text("city").notNull().default(""),
    onlineUrl: text("online_url").notNull().default(""),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    registrationOpensAt: ts("registration_opens_at"),
    registrationClosesAt: ts("registration_closes_at"),
    capacity: integer("capacity"),
    registrationEnabled: boolean("registration_enabled")
      .notNull()
      .default(true),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    visibility: eventVisibility("visibility").notNull().default("public"),
    status: eventStatus("status").notNull().default("draft"),
    schedulePublished: boolean("schedule_published").notNull().default(false),
    organizerName: text("organizer_name").notNull(),
    organizerEmail: text("organizer_email").notNull().default(""),
    hiddenByAdmin: boolean("hidden_by_admin").notNull().default(false),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("events_org_idx").on(t.organizationId, t.startsAt),
    index("events_public_idx").on(t.status, t.visibility, t.startsAt),
    check("events_dates_chk", sql`${t.endsAt} > ${t.startsAt}`),
    check(
      "events_capacity_chk",
      sql`${t.capacity} is null or ${t.capacity} > 0`,
    ),
  ],
);

/* ─────────────────────────────────────────────────────────────
 * Programs (activities) and schedule items (sessions)
 * ───────────────────────────────────────────────────────────── */

export const programs = pgTable(
  "programs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    label: text("label").notNull().default(""),
    venue: text("venue").notNull().default(""),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("programs_event_idx").on(t.eventId, t.position),
    check("programs_dates_chk", sql`${t.endsAt} > ${t.startsAt}`),
  ],
);

export const scheduleItems = pgTable(
  "schedule_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    programId: uuid("program_id").references(() => programs.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    speaker: text("speaker").notNull().default(""),
    stage: text("stage").notNull().default(""),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("schedule_items_event_idx").on(t.eventId, t.startsAt),
    index("schedule_items_program_idx").on(t.programId),
    check("schedule_items_dates_chk", sql`${t.endsAt} > ${t.startsAt}`),
  ],
);

/* ─────────────────────────────────────────────────────────────
 * Registrations
 * ───────────────────────────────────────────────────────────── */

export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    /** Unguessable public reference used in /registrations/[code]. */
    code: text("code").notNull().unique(),
    fullName: text("full_name").notNull(),
    /** Always stored lowercase. */
    email: text("email").notNull(),
    phone: text("phone").notNull().default(""),
    institution: text("institution").notNull().default(""),
    notes: text("notes").notNull().default(""),
    status: registrationStatus("status").notNull().default("pending"),
    decidedAt: ts("decided_at"),
    decidedBy: text("decided_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("registrations_event_status_idx").on(t.eventId, t.status),
    index("registrations_email_idx").on(t.email),
    index("registrations_user_idx").on(t.userId),
    // One *active* registration per email per event. Cancelled/rejected rows
    // do not block a later re-registration.
    uniqueIndex("registrations_event_email_active_uq")
      .on(t.eventId, t.email)
      .where(sql`${t.status} in ('pending', 'confirmed')`),
  ],
);

/* ─────────────────────────────────────────────────────────────
 * Announcements and activity log
 * ───────────────────────────────────────────────────────────── */

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: announcementStatus("status").notNull().default("draft"),
    publishedAt: ts("published_at"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("announcements_event_idx").on(t.eventId, t.publishedAt)],
);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("activity_logs_org_idx").on(t.organizationId, t.createdAt)],
);

/* ─────────────────────────────────────────────────────────────
 * Relations (used by the relational query API where convenient)
 * ───────────────────────────────────────────────────────────── */

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  events: many(events),
}));

export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.organizationId],
      references: [organizations.id],
    }),
    user: one(user, {
      fields: [organizationMembers.userId],
      references: [user.id],
    }),
  }),
);

export const eventsRelations = relations(events, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [events.organizationId],
    references: [organizations.id],
  }),
  programs: many(programs),
  scheduleItems: many(scheduleItems),
  registrations: many(registrations),
  announcements: many(announcements),
}));

export const programsRelations = relations(programs, ({ one, many }) => ({
  event: one(events, { fields: [programs.eventId], references: [events.id] }),
  scheduleItems: many(scheduleItems),
}));

export const scheduleItemsRelations = relations(scheduleItems, ({ one }) => ({
  event: one(events, {
    fields: [scheduleItems.eventId],
    references: [events.id],
  }),
  program: one(programs, {
    fields: [scheduleItems.programId],
    references: [programs.id],
  }),
}));

export const registrationsRelations = relations(registrations, ({ one }) => ({
  event: one(events, {
    fields: [registrations.eventId],
    references: [events.id],
  }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  event: one(events, {
    fields: [announcements.eventId],
    references: [events.id],
  }),
}));

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Program = typeof programs.$inferSelect;
export type ScheduleItem = typeof scheduleItems.$inferSelect;
export type Registration = typeof registrations.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type MemberRole = (typeof memberRole.enumValues)[number];
export type EventStatus = (typeof eventStatus.enumValues)[number];
export type RegistrationStatus = (typeof registrationStatus.enumValues)[number];
