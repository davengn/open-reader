import { describe, expect, it } from "vitest";
import { normalizeBookFilter, normalizeBookSort } from "@/lib/library/preferences";

describe("library preference normalization", () => {
  it("keeps supported filters and falls back to all", () => {
    expect(normalizeBookFilter("pdf")).toBe("pdf");
    expect(normalizeBookFilter("epub")).toBe("epub");
    expect(normalizeBookFilter("audio")).toBe("all");
  });

  it("keeps supported sorts and falls back to date added", () => {
    expect(normalizeBookSort("author")).toBe("author");
    expect(normalizeBookSort("lastRead")).toBe("lastRead");
    expect(normalizeBookSort("unknown")).toBe("dateAdded");
  });
});
