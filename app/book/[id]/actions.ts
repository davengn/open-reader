"use server";

import { upsertPdfProgress } from "@/lib/db/queries/reader";
import { calculatePdfProgress } from "@/lib/reader/progress";

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
