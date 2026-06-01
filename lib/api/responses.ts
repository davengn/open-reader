import { NextResponse } from "next/server";

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export function acceptedJson<T>(payload: T) {
  return NextResponse.json(payload, { status: 202 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}
