"use server";

import { upsertPdfProgress, upsertEpubProgress } from "@/lib/db/queries/reader";
import {
  deleteReaderNote as deleteReaderNoteQuery,
  saveReaderNote as saveReaderNoteQuery,
} from "@/lib/db/queries/notes";
import { calculatePdfProgress } from "@/lib/reader/progress";
import type { ReaderNote } from "@/lib/types/reader";

type UpdateProgressInput = {
  bookId: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
};

export async function updateProgress(input: UpdateProgressInput): Promise<{
  ok: true;
  currentPage: number;
  percentage: number;
  updatedAt: number;
}> {
  const percentage = Number.isFinite(input.percentage)
    ? input.percentage
    : calculatePdfProgress(input.currentPage, input.totalPages);
  const progress = upsertPdfProgress({
    bookId: input.bookId,
    currentPage: input.currentPage,
    totalPages: input.totalPages,
    percentage,
  });

  return {
    ok: true,
    currentPage: progress.currentPage,
    percentage: progress.percentage,
    updatedAt: progress.updatedAt,
  };
}

type UpdateEpubProgressInput = {
  bookId: string;
  cfi: string;
  percentage: number;
  chapter?: string;
};

export async function updateEpubProgress(input: UpdateEpubProgressInput): Promise<{
  ok: true;
  cfi: string;
  percentage: number;
  chapter?: string;
  updatedAt: number;
}> {
  const progress = upsertEpubProgress({
    bookId: input.bookId,
    cfi: input.cfi,
    percentage: input.percentage,
    chapter: input.chapter,
  });

  return {
    ok: true,
    cfi: progress.cfi,
    percentage: progress.percentage,
    chapter: progress.chapter,
    updatedAt: progress.updatedAt,
  };
}

type SaveReaderNoteInput = {
  bookId: string;
  noteId?: number | null;
  highlightId?: number | null;
  content: string;
  page?: number | null;
  cfi?: string | null;
};

export async function saveReaderNote(input: SaveReaderNoteInput): Promise<
  | {
      ok: true;
      deleted: false;
      detached?: false;
      note: ReaderNote;
    }
  | {
      ok: true;
      deleted: true;
      note: null;
    }
  | {
      ok: true;
      deleted: false;
      detached: true;
      message: string;
      note: ReaderNote;
    }
> {
  const result = saveReaderNoteQuery(input);
  if (result.deleted) {
    return {
      ok: true,
      deleted: true,
      note: null,
    };
  }

  if (result.detached) {
    return {
      ok: true,
      deleted: false,
      detached: true,
      message: result.message,
      note: result.note,
    };
  }

  return {
    ok: true,
    deleted: false,
    note: result.note,
  };
}

export async function deleteReaderNote(input: { bookId: string; noteId: number }): Promise<{ ok: true }> {
  deleteReaderNoteQuery(input.bookId, input.noteId);
  return { ok: true };
}
