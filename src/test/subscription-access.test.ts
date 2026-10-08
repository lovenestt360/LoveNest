import { describe, expect, it } from "vitest";
import { hasActivePaidSubscription } from "@/lib/subscriptionAccess";

describe("hasActivePaidSubscription", () => {
  const now = new Date("2026-10-08T12:00:00Z");

  it("accepts an active lifetime subscription", () => {
    expect(hasActivePaidSubscription({ subscription_status: "active", subscription_ends_at: null }, now)).toBe(true);
  });

  it("accepts a paid term that has not expired", () => {
    expect(hasActivePaidSubscription({
      subscription_status: "active",
      subscription_ends_at: "2026-11-08T12:00:00Z",
    }, now)).toBe(true);
  });

  it("rejects expired and inactive subscriptions", () => {
    expect(hasActivePaidSubscription({
      subscription_status: "active",
      subscription_ends_at: "2026-10-08T11:59:59Z",
    }, now)).toBe(false);
    expect(hasActivePaidSubscription({ subscription_status: "inactive" }, now)).toBe(false);
  });
});
