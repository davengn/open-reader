import { NextResponse } from "next/server";
import {
  upsertPdfProgress,
  upsertEpubProgress,
  getCurrentPdfProgress,
  getCurrentEpubProgress,
  ReaderQueryError,
} from "@/lib/db/queries/reader";
import { calculatePdfProgress } from "@/lib/reader/progress";
import { getBookById } from "@/lib/db/queries/books";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const book = getBookById(id);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  if (book.format === "epub") {
    const progress = getCurrentEpubProgress(id);
    return NextResponse.json({ progress });
  } else {
    const progress = getCurrentPdfProgress(id);
    return NextResponse.json({ progress });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const body = await readJsonBody(request);

    if (body.cfi !== undefined && body.cfi !== null) {
      const progress = upsertEpubProgress({
        bookId: id,
        cfi: String(body.cfi),
        percentage: Number(body.percentage),
        chapter: body.chapter ? String(body.chapter) : undefined,
      });
      return NextResponse.json({ progress });
    }

    const currentPage = Number(body.currentPage);
    const totalPages = Number(body.totalPages);
    const percentage = Number.isFinite(Number(body.percentage))
      ? Number(body.percentage)
      : calculatePdfProgress(currentPage, totalPages);

    const progress = upsertPdfProgress({
      bookId: id,
      currentPage,
      totalPages,
      percentage,
    });

    return NextResponse.json({ progress });
  } catch (error) {
    if (error instanceof ReaderQueryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Progress could not be saved" }, { status: 400 });
  }
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const rawBody = await request.text();
  if (!rawBody.trim()) {
    return {};
  }

  const parsed = JSON.parse(rawBody) as unknown;
  return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
}
