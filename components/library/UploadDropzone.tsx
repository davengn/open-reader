"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";

type UploadDropzoneProps = {
  onUploaded: () => void | Promise<void>;
};

export function UploadDropzone({ onUploaded }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function uploadFile(file: File | null | undefined) {
    if (!file) {
      return;
    }

    setBusy(true);
    setMessage(null);
    const body = new FormData();
    body.append("file", file);

    try {
      const response = await fetch("/api/books", { method: "POST", body });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage({ kind: "error", text: payload.error ?? "Upload failed" });
        return;
      }

      setMessage({ kind: "success", text: "Book added. Indexing has started." });
      await onUploaded();
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <section
      className={`upload-dropzone${dragging ? " is-dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        uploadFile(event.dataTransfer.files.item(0));
      }}
      aria-label="Upload a PDF or EPUB"
    >
      <div className="upload-title">
        <Upload className="inline-icon" aria-hidden="true" />
        Add a book
      </div>
      <p className="upload-copy">Drop a PDF or EPUB up to 200 MB, or choose a local file from disk.</p>
      <div className="upload-actions">
        <button className="button-primary" type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
          <Upload className="inline-icon" aria-hidden="true" />
          {busy ? "Uploading" : "Choose file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.epub,application/pdf,application/epub+zip"
          hidden
          onChange={(event) => uploadFile(event.target.files?.item(0))}
        />
      </div>
      {message ? <p className={`message ${message.kind}`}>{message.text}</p> : null}
    </section>
  );
}
