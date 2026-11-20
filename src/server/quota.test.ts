import { describe, it, expect } from "vitest";
import { createDailyQuota } from "./quota.ts";

describe("createDailyQuota", () => {
  it("accepte jusqu'à la limite puis refuse", () => {
    const quota = createDailyQuota(2, () => new Date("2026-11-18T10:00:00Z"));
    expect(quota.take()).toBe(true);
    expect(quota.take()).toBe(true);
    expect(quota.take()).toBe(false);
    expect(quota.remaining()).toBe(0);
  });

  it("repart à zéro le lendemain", () => {
    let date = new Date("2026-11-18T23:59:00Z");
    const quota = createDailyQuota(1, () => date);
    expect(quota.take()).toBe(true);
    expect(quota.take()).toBe(false);

    date = new Date("2026-11-19T00:01:00Z");
    expect(quota.remaining()).toBe(1);
    expect(quota.take()).toBe(true);
  });
});
