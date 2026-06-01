import { describe, expect, it } from "vitest";
import { DELETE as DELETE_HIGHLIGHT } from "@/app/api/highlights/[id]/route";
import { GET, POST } from "@/app/api/notes/route";
import { DELETE, PATCH } from "@/app/api/notes/[id]/route";
import { createReadyBook, createTestEnv, seedEpubHighlight, seedPdfHighlight } from "../helpers/testEnv";

describe("notes API", () => {
  it("creates, updates, searches, and deletes an attached highlight note", async () => {
    await createTestEnv();
    const { id } = await createReadyBook("pdf");
    const highlightId = seedPdfHighlight(id, { page: 2 });

    const createResponse = await POST(noteRequest("http://test.local/api/notes", {
      bookId: id,
      highlightId,
      content: "first durable note",
      page: 2,
    }));
    const created = (await createResponse.json()) as { note: { id: number; content: string }; deleted: boolean };

    expect(createResponse.status).toBe(201);
    expect(created.note.content).toBe("first durable note");

    const patchResponse = await PATCH(noteRequest(`http://test.local/api/notes/${created.note.id}`, {
      bookId: id,
      noteId: created.note.id,
      highlightId,
      content: "updated searchable note",
      page: 2,
    }), { params: Promise.resolve({ id: String(created.note.id) }) });
    expect(patchResponse.status).toBe(200);

    const searchResponse = await GET(new Request(`http://test.local/api/notes?bookId=${id}&q=searchable`));
    const searchPayload = (await searchResponse.json()) as { notes: Array<{ content: string }> };
    expect(searchPayload.notes.map((note) => note.content)).toEqual(["updated searchable note"]);

    const deleteByWhitespace = await PATCH(noteRequest(`http://test.local/api/notes/${created.note.id}`, {
      bookId: id,
      noteId: created.note.id,
      highlightId,
      content: "   ",
      page: 2,
    }), { params: Promise.resolve({ id: String(created.note.id) }) });
    const deleted = (await deleteByWhitespace.json()) as { note: null; deleted: boolean };
    expect(deleted).toEqual({ note: null, deleted: true });
  });

  it("creates standalone PDF and EPUB notes and lists them by book", async () => {
    await createTestEnv();
    const pdf = await createReadyBook("pdf");
    const epub = await createReadyBook("epub");

    const pdfResponse = await POST(noteRequest("http://test.local/api/notes", {
      bookId: pdf.id,
      content: "PDF page thought",
      page: 2,
    }));
    const epubResponse = await POST(noteRequest("http://test.local/api/notes", {
      bookId: epub.id,
      content: "EPUB CFI thought",
      cfi: "epubcfi(/6/4[chap-2]!/4/2/10/1:0)",
    }));

    expect(pdfResponse.status).toBe(201);
    expect(epubResponse.status).toBe(201);

    const pdfList = (await (await GET(new Request(`http://test.local/api/notes?bookId=${pdf.id}&standalone=true`))).json()) as {
      notes: Array<{ content: string; page: number | null; cfi: string | null }>;
    };
    const epubList = (await (await GET(new Request(`http://test.local/api/notes?bookId=${epub.id}&standalone=true`))).json()) as {
      notes: Array<{ content: string; page: number | null; cfi: string | null }>;
    };

    expect(pdfList.notes).toEqual([expect.objectContaining({ content: "PDF page thought", page: 2 })]);
    expect(epubList.notes).toEqual([expect.objectContaining({ content: "EPUB CFI thought", cfi: expect.any(String) })]);
  });

  it("converts an attached note save into a standalone note when the highlight was deleted", async () => {
    await createTestEnv();
    const { id } = await createReadyBook("pdf");
    const highlightId = seedPdfHighlight(id, { page: 1 });

    const createResponse = await POST(noteRequest("http://test.local/api/notes", {
      bookId: id,
      highlightId,
      content: "attached before delete",
      page: 1,
    }));
    const created = (await createResponse.json()) as { note: { id: number } };

    await DELETE_HIGHLIGHT(new Request(`http://test.local/api/highlights/${highlightId}`), {
      params: Promise.resolve({ id: String(highlightId) }),
    });

    const detachResponse = await PATCH(noteRequest(`http://test.local/api/notes/${created.note.id}`, {
      bookId: id,
      noteId: created.note.id,
      highlightId,
      content: "kept after delete",
      page: 1,
    }), { params: Promise.resolve({ id: String(created.note.id) }) });
    const detached = (await detachResponse.json()) as { detached: boolean; note: { highlightId: number | null } };

    expect(detachResponse.status).toBe(409);
    expect(detached.detached).toBe(true);
    expect(detached.note.highlightId).toBeNull();
  });

  it("deletes a standalone note by id", async () => {
    await createTestEnv();
    const { id } = await createReadyBook("pdf");
    const createResponse = await POST(noteRequest("http://test.local/api/notes", {
      bookId: id,
      content: "delete me",
      page: 1,
    }));
    const created = (await createResponse.json()) as { note: { id: number } };

    const deleteResponse = await DELETE(new Request(`http://test.local/api/notes/${created.note.id}`, { method: "DELETE" }), {
      params: Promise.resolve({ id: String(created.note.id) }),
    });
    const list = (await (await GET(new Request(`http://test.local/api/notes?bookId=${id}`))).json()) as { notes: unknown[] };

    expect(deleteResponse.status).toBe(204);
    expect(list.notes).toEqual([]);
  });
});

function noteRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
