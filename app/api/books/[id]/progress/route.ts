import { NextResponse } from "next/server";
import { upsertPdfProgress, ReaderQueryError } from "@/lib/db/queries/reader";
import { calculatePdfProgress } from "@/lib/reader/progress";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const body = await readJsonBody(request);
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
