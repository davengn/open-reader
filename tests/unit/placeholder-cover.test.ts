import { describe, expect, it } from "vitest";
import { getBookInitials } from "@/lib/library/covers";
import { createPlaceholderCoverSvg } from "@/lib/storage/covers";

describe("placeholder covers", () => {
  it("creates stable initials", () => {
    expect(getBookInitials("Building Data Intensive Applications")).toBe("BD");
    expect(getBookInitials("")).toBe("OR");
  });

  it("generates deterministic SVG output for the same book", () => {
    const first = createPlaceholderCoverSvg("Building Microservices", "Sam Newman", "pdf").toString("utf8");
    const second = createPlaceholderCoverSvg("Building Microservices", "Sam Newman", "pdf").toString("utf8");
    expect(first).toBe(second);
    expect(first).toContain("BM");
  });
});
