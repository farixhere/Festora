import { describe, expect, it } from "vitest";
import { canTransition, holdsSeat, registrationWindow } from "@/features/registrations/policy";
import { assignableRoles, can, canModifyMember } from "@/lib/permissions";

describe("seat policy", () => {
  it("pending and confirmed hold seats; cancelled and rejected free them", () => {
    expect(holdsSeat("pending")).toBe(true);
    expect(holdsSeat("confirmed")).toBe(true);
    expect(holdsSeat("cancelled")).toBe(false);
    expect(holdsSeat("rejected")).toBe(false);
  });
  it("terminal states cannot be reinstated", () => {
    expect(canTransition("cancelled", "confirmed")).toBe(false);
    expect(canTransition("rejected", "pending")).toBe(false);
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "pending")).toBe(false);
  });
});

describe("registration window", () => {
  const base = {
    registrationEnabled: true,
    registrationOpensAt: null,
    registrationClosesAt: null,
    endsAt: new Date("2030-01-02T00:00:00Z"),
  };
  const now = new Date("2030-01-01T00:00:00Z");
  it("open by default", () => expect(registrationWindow(base, now)).toBe("open"));
  it("disabled", () => expect(registrationWindow({ ...base, registrationEnabled: false }, now)).toBe("disabled"));
  it("not started", () =>
    expect(registrationWindow({ ...base, registrationOpensAt: new Date("2030-01-01T06:00:00Z") }, now)).toBe("not_started"));
  it("closed after deadline", () =>
    expect(registrationWindow({ ...base, registrationClosesAt: new Date("2029-12-31T00:00:00Z") }, now)).toBe("closed"));
  it("ended once the event is over", () =>
    expect(registrationWindow({ ...base, endsAt: new Date("2029-12-31T00:00:00Z") }, now)).toBe("ended"));
});

describe("permissions", () => {
  it("only owners delete organizations", () => {
    expect(can("owner", "org.delete")).toBe(true);
    expect(can("admin", "org.delete")).toBe(false);
    expect(can("organizer", "org.delete")).toBe(false);
  });
  it("viewers are read-only", () => {
    expect(can("viewer", "event.view")).toBe(true);
    expect(can("viewer", "event.edit")).toBe(false);
    expect(can("viewer", "registration.manage")).toBe(false);
  });
  it("nobody modifies owners; admins cannot modify admins", () => {
    expect(canModifyMember("owner", "owner")).toBe(false);
    expect(canModifyMember("admin", "admin")).toBe(false);
    expect(canModifyMember("admin", "organizer")).toBe(true);
    expect(canModifyMember("organizer", "viewer")).toBe(false);
  });
  it("owners are never assignable", () => {
    expect(assignableRoles("owner")).not.toContain("owner");
    expect(assignableRoles("viewer")).toEqual([]);
  });
});
