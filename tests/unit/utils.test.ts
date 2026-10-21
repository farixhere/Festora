import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/utils/csv";
import { safeNext } from "@/lib/utils/redirect";
import { newRegistrationCode, slugify } from "@/lib/utils/slug";
import { utcToZonedLocal, zonedLocalToUtc } from "@/lib/utils/dates";

describe("csv", () => {
  it("neutralises formula injection", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("@sum")).toBe("'@sum");
  });
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("a\nb")).toBe('"a\nb"');
  });
  it("handles null and adds a BOM", () => {
    expect(csvCell(null)).toBe("");
    expect(toCsv([["a", "b"]]).startsWith("﻿")).toBe(true);
  });
});

describe("safeNext", () => {
  it("allows same-site paths", () => {
    expect(safeNext("/dashboard/events?x=1")).toBe("/dashboard/events?x=1");
  });
  it("rejects open redirects", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", "/a\nb"]) {
      expect(safeNext(bad)).toBe("/dashboard");
    }
    expect(safeNext(null, "/x")).toBe("/x");
  });
});

describe("slug and codes", () => {
  it("slugifies", () => {
    expect(slugify("Annual Tech Fest 2026!")).toBe("annual-tech-fest-2026");
  });
  it("generates unguessable, unique registration codes", () => {
    const a = newRegistrationCode();
    expect(a).toMatch(/^FST-[A-Za-z0-9_-]{12}$/);
    const set = new Set(Array.from({ length: 500 }, newRegistrationCode));
    expect(set.size).toBe(500);
  });
});

describe("timezone conversion", () => {
  it("converts wall-clock in a zone to UTC and back", () => {
    const d = zonedLocalToUtc("2026-12-01T10:00", "Asia/Kolkata")!;
    expect(d.toISOString()).toBe("2026-12-01T04:30:00.000Z");
    expect(utcToZonedLocal(d, "Asia/Kolkata")).toBe("2026-12-01T10:00");
  });
  it("respects DST", () => {
    const d = zonedLocalToUtc("2026-07-01T12:00", "America/New_York")!;
    expect(d.toISOString()).toBe("2026-07-01T16:00:00.000Z");
  });
  it("returns null for garbage", () => {
    expect(zonedLocalToUtc("not a date", "UTC")).toBeNull();
  });
});
