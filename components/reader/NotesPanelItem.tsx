"use client";

import { useState } from "react";
import { FileText, MessageSquareText, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteEditor } from "@/components/reader/NoteEditor";
import type { ReaderAnnotationItem, ReaderAnnotationNavigationTarget, ReaderNote } from "@/lib/types/reader";

type NotesPanelItemProps = {
  item: ReaderAnnotationItem;
  onNavigate: (target: ReaderAnnotationNavigationTarget) => void;
  onChanged: () => void;
};

export function NotesPanelItem({ item, onNavigate, onChanged }: NotesPanelItemProps) {
  const [editorOpen, setEditorOpen] = useState(item.kind === "standalone-note" || Boolean(item.noteContent));
  const [noteId, setNoteId] = useState(item.noteId);
  const [noteContent, setNoteContent] = useState(item.noteContent);

  function handleSaved(note: ReaderNote | null) {
    if (note) {
      setNoteId(note.id);
      setNoteContent(note.content);
    }
    onChanged();
  }

  function handleDeleted() {
    setNoteId(null);
    setNoteContent("");
    setEditorOpen(false);
    onChanged();
  }

  const hasNote = Boolean(noteContent.trim());

  return (
    <article className={`notes-panel-item ${item.kind}`}>
      <button
        type="button"
        className="notes-panel-item-main"
        onClick={() => onNavigate({ page: item.page, cfi: item.cfi, label: item.locationLabel })}
      >
        {item.color ? <span className={`note-color-bar ${item.color}`} aria-hidden="true" /> : <FileText className="note-doc-icon" aria-hidden="true" />}
        <span className="notes-panel-item-copy">
          <span className="notes-panel-item-text" title={item.fullText}>
            {item.excerpt}
          </span>
          <span className="notes-panel-item-meta">
            {item.locationLabel}
            {hasNote ? (
              <>
                {" / "}
                <MessageSquareText className="inline-icon" aria-hidden="true" />
                Note
              </>
            ) : null}
          </span>
        </span>
        <Navigation className="notes-panel-nav-icon" aria-hidden="true" />
      </button>

      {item.kind === "highlight" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="notes-panel-note-toggle"
          onClick={() => setEditorOpen((open) => !open)}
        >
          {hasNote || editorOpen ? "Edit note" : "Add note"}
        </Button>
      ) : null}

      {editorOpen ? (
        <NoteEditor
          bookId={item.bookId}
          noteId={noteId}
          highlightId={item.highlightId}
          page={item.page}
          cfi={item.cfi}
          initialValue={noteContent}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      ) : null}
    </article>
  );
}
