import type { NoteSaveStatus } from "@/lib/types/reader";

export const NOTE_AUTOSAVE_DELAY_MS = 800;

export type NoteEditorState = {
  value: string;
  status: NoteSaveStatus;
  message: string | null;
};

export function createNoteEditorState(value = ""): NoteEditorState {
  return {
    value,
    status: "idle",
    message: null,
  };
}

export function nextDirtyNoteState(state: NoteEditorState, value: string): NoteEditorState {
  return {
    value,
    status: "idle",
    message: state.status === "error" ? state.message : null,
  };
}

export function resizeTextareaElement(textarea: HTMLTextAreaElement | null) {
  if (!textarea) {
    return;
  }

  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}
