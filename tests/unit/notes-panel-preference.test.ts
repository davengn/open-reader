import { describe, expect, it } from "vitest";
import {
  NOTES_PANEL_STORAGE_KEY,
  getStoredNotesPanelPreference,
  parseNotesPanelPreference,
  saveNotesPanelPreference,
} from "@/lib/reader/notesPanelPreference";

describe("notes panel preference", () => {
  it("parses valid values", () => {
    expect(parseNotesPanelPreference("open")).toBe("open");
    expect(parseNotesPanelPreference("closed")).toBe("closed");
  });

  it("ignores missing or malformed values", () => {
    expect(parseNotesPanelPreference(null)).toBeNull();
    expect(parseNotesPanelPreference("expanded")).toBeNull();
  });

  it("reads and writes the expected localStorage key", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    };

    saveNotesPanelPreference(storage, "open");

    expect(store.get(NOTES_PANEL_STORAGE_KEY)).toBe("open");
    expect(getStoredNotesPanelPreference(storage)).toBe("open");
  });
});
