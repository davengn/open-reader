"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteReaderNote, saveReaderNote } from "@/app/book/[id]/actions";
import { Button } from "@/components/ui/button";
import { NOTE_AUTOSAVE_DELAY_MS, resizeTextareaElement } from "@/lib/reader/textareaAutosize";
import { NOTE_MAX_LENGTH, NOTE_MAX_LENGTH_ERROR, isWhitespaceOnlyNote } from "@/lib/reader/noteValidation";
import type { NoteSaveStatus, ReaderNote } from "@/lib/types/reader";

type NoteEditorProps = {
  bookId: string;
  noteId: number | null;
  highlightId: number | null;
  page: number | null;
  cfi: string | null;
  initialValue: string;
  autoFocus?: boolean;
  onSaved: (note: ReaderNote | null) => void;
  onDeleted: () => void;
};

export function NoteEditor({
  bookId,
  noteId,
  highlightId,
  page,
  cfi,
  initialValue,
  autoFocus = false,
  onSaved,
  onDeleted,
}: NoteEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<NoteSaveStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastSavedValueRef = useRef(initialValue);

  useEffect(() => {
    setValue(initialValue);
    lastSavedValueRef.current = initialValue;
    setStatus("idle");
    setMessage(null);
  }, [initialValue, noteId]);

  useEffect(() => {
    resizeTextareaElement(textareaRef.current);
  }, [value]);

  useEffect(() => {
    if (value === lastSavedValueRef.current) {
      return;
    }

    if (!noteId && isWhitespaceOnlyNote(value)) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setStatus("saving");
      setMessage(null);
      startTransition(() => {
        void saveReaderNote({
          bookId,
          noteId,
          highlightId,
          content: value,
          page,
          cfi,
        })
          .then((result) => {
            if (result.deleted) {
              lastSavedValueRef.current = "";
              setValue("");
              setStatus("saved");
              setMessage("Saved");
              onDeleted();
              return;
            }

            lastSavedValueRef.current = result.note.content;
            if (result.detached) {
              setStatus("detached");
              setMessage(result.message);
            } else {
              setStatus("saved");
              setMessage("Saved");
            }
            onSaved(result.note);
          })
          .catch((error) => {
            setStatus("error");
            setMessage(error instanceof Error && error.message === NOTE_MAX_LENGTH_ERROR
              ? NOTE_MAX_LENGTH_ERROR
              : "Save failed. Your changes are not saved.");
          });
      });
    }, NOTE_AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [bookId, cfi, highlightId, noteId, onDeleted, onSaved, page, value]);

  async function handleDelete() {
    if (!noteId) {
      setValue("");
      onDeleted();
      return;
    }

    setStatus("saving");
    try {
      await deleteReaderNote({ bookId, noteId });
      lastSavedValueRef.current = "";
      setValue("");
      setStatus("saved");
      setMessage("Saved");
      onDeleted();
    } catch {
      setStatus("error");
      setMessage("Save failed. Your changes are not saved.");
    }
  }

  const statusText = status === "saving" || isPending ? "Saving" : message;

  return (
    <div className={`note-editor${status === "error" ? " has-error" : ""}`}>
      <textarea
        ref={textareaRef}
        value={value}
        maxLength={NOTE_MAX_LENGTH}
        autoFocus={autoFocus}
        aria-label="Markdown note"
        onChange={(event) => {
          setValue(event.target.value);
          setStatus("idle");
          setMessage(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setMessage(null);
            setStatus("idle");
          }
        }}
        placeholder="Write a Markdown note..."
      />
      <div className="note-editor-footer">
        <span className={`note-editor-status ${status}`} role={status === "error" ? "alert" : "status"}>
          {statusText}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          aria-label="Delete note"
          title="Delete note"
        >
          <Trash2 className="inline-icon" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
