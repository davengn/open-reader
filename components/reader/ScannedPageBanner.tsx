"use client";

import { FileWarning } from "lucide-react";

export function ScannedPageBanner() {
  return (
    <div className="scanned-banner" role="status">
      <FileWarning className="inline-icon" aria-hidden="true" />
      <span>This page appears to be image-only, so text selection and highlights are unavailable here.</span>
    </div>
  );
}
