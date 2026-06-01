"use client";

import { AlertTriangle, Loader2, Lock, ShieldAlert } from "lucide-react";

type ReaderStatusBannerProps = {
  status: "loading" | "drm-error" | "invalid-cfi" | "error";
  message?: string;
  onDismissInvalidCfi?: () => void;
};

export function ReaderStatusBanner({ status, message, onDismissInvalidCfi }: ReaderStatusBannerProps) {
  if (status === "loading") {
    return (
      <div className="reader-status-banner loading" role="status">
        <Loader2 className="inline-icon animate-spin" aria-hidden="true" />
        <span>{message || "Loading book content..."}</span>
      </div>
    );
  }

  if (status === "drm-error") {
    return (
      <div className="reader-status-banner error drm-error" role="alert">
        <Lock className="inline-icon" aria-hidden="true" />
        <span>{message || "This book is DRM-protected and cannot be opened."}</span>
      </div>
    );
  }

  if (status === "invalid-cfi") {
    return (
      <div className="reader-status-banner warning invalid-cfi" role="status">
        <AlertTriangle className="inline-icon" aria-hidden="true" />
        <span>{message || "Saved position could not be restored. Opening from the beginning."}</span>
        {onDismissInvalidCfi && (
          <button className="dismiss-button" onClick={onDismissInvalidCfi} type="button">
            Dismiss
          </button>
        )}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="reader-status-banner error" role="alert">
        <ShieldAlert className="inline-icon" aria-hidden="true" />
        <span>{message || "An error occurred while loading this book."}</span>
      </div>
    );
  }

  return null;
}
