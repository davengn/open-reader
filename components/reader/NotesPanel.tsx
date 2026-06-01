"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FilePlus2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteEditor } from "@/components/reader/NoteEditor";
import { NotesPanelItem } from "@/components/reader/NotesPanelItem";
import { buildAnnotationItems, groupAnnotationItems } from "@/lib/reader/annotationSort";
import type { ReaderAnnotationNavigationTarget, ReaderNote, ReaderPanelHighlight } from "@/lib/types/reader";

type NotesPanelProps = {
  bookId: string;
  isOpen: boolean;
  currentPage: number | null;
  currentCfi: string | null;
  currentChapter: string | null;
  onClose: () => void;
  onNavigate: (target: ReaderAnnotationNavigationTarget) => void;
};

export function NotesPanel({
  bookId,
  isOpen,
  currentPage,
  currentCfi,
  currentChapter,
  onClose,
  onNavigate,
}: NotesPanelProps) {
  const [highlights, setHighlights] = useState<ReaderPanelHighlight[]>([]);
  const [standaloneNotes, setStandaloneNotes] = useState<ReaderNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);

  const loadAnnotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [highlightsResponse, notesResponse] = await Promise.all([
        fetch(`/api/highlights?bookId=${encodeURIComponent(bookId)}&includeNotes=true`, { cache: "no-store" }),
        fetch(`/api/notes?bookId=${encodeURIComponent(bookId)}&standalone=true`, { cache: "no-store" }),
      ]);

      if (!highlightsResponse.ok || !notesResponse.ok) {
        throw new Error("The notes panel could not be loaded.");
      }

      const highlightsPayload = (await highlightsResponse.json()) as { highlights?: ReaderPanelHighlight[] };
      const notesPayload = (await notesResponse.json()) as { notes?: ReaderNote[] };
      setHighlights(highlightsPayload.highlights ?? []);
      setStandaloneNotes(notesPayload.notes ?? []);
    } catch {
      setError("The notes panel could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    if (isOpen) {
      void loadAnnotations();
    }
  }, [isOpen, loadAnnotations]);

  const groups = useMemo(() => {
    const items = buildAnnotationItems({ highlights, standaloneNotes, currentChapter });
    return groupAnnotationItems(items);
  }, [currentChapter, highlights, standaloneNotes]);

  if (!isOpen) {
    return null;
  }

  function handleNavigate(target: ReaderAnnotationNavigationTarget) {
    if (!target.page && !target.cfi) {
      setNavigationError(`Could not navigate to ${target.label}.`);
      return;
    }

    setNavigationError(null);
    onNavigate(target);
  }

  return (
    <aside className="notes-panel" aria-label="Highlights and notes">
      <div className="notes-panel-header">
        <div>
          <p className="eyebrow">Memory</p>
          <h2>Highlights & notes</h2>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Hide notes" title="Hide notes">
          <X className="inline-icon" aria-hidden="true" />
        </Button>
      </div>

      <div className="notes-panel-actions">
        <Button type="button" variant="secondary" size="sm" onClick={() => setDraftOpen((open) => !open)}>
          <FilePlus2 className="inline-icon" aria-hidden="true" />
          Add page note
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <a href={`/api/books/${encodeURIComponent(bookId)}/export`} download>
            <Download className="inline-icon" aria-hidden="true" />
            Export
          </a>
        </Button>
      </div>

      {draftOpen ? (
        <div className="notes-panel-draft">
          <NoteEditor
            bookId={bookId}
            noteId={null}
            highlightId={null}
            page={currentPage}
            cfi={currentCfi}
            initialValue=""
            autoFocus
            onSaved={() => {
              setDraftOpen(false);
              void loadAnnotations();
            }}
            onDeleted={() => setDraftOpen(false)}
          />
        </div>
      ) : null}

      {navigationError ? <p className="notes-panel-alert" role="alert">{navigationError}</p> : null}
      {error ? <p className="notes-panel-alert" role="alert">{error}</p> : null}

      <div className="notes-panel-body">
        {loading ? (
          <div className="notes-panel-empty" role="status">
            <Loader2 className="inline-icon spinner" aria-hidden="true" />
            Loading notes
          </div>
        ) : groups.length === 0 ? (
          <div className="notes-panel-empty">No highlights or notes yet.</div>
        ) : (
          groups.map((group) => (
            <section key={group.chapter} className="notes-panel-group">
              <h3>{group.chapter}</h3>
              <div className="notes-panel-list">
                {group.items.map((item) => (
                  <NotesPanelItem
                    key={item.id}
                    item={item}
                    onNavigate={handleNavigate}
                    onChanged={loadAnnotations}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </aside>
  );
}
