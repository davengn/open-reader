export const NOTES_PANEL_STORAGE_KEY = "reader.notesPanel";
export type NotesPanelPreference = "open" | "closed";

export function parseNotesPanelPreference(value: string | null | undefined): NotesPanelPreference | null {
  if (value === "open" || value === "closed") {
    return value;
  }

  return null;
}

export function getStoredNotesPanelPreference(storage: Pick<Storage, "getItem"> | null | undefined) {
  if (!storage) {
    return null;
  }

  try {
    return parseNotesPanelPreference(storage.getItem(NOTES_PANEL_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveNotesPanelPreference(
  storage: Pick<Storage, "setItem"> | null | undefined,
  value: NotesPanelPreference,
) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(NOTES_PANEL_STORAGE_KEY, value);
  } catch {
    // localStorage can be unavailable in privacy modes.
  }
}
