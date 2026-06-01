"use client";

import { forwardRef } from "react";

type EpubViewerStageProps = {
  viewerId?: string;
};

export const EpubViewerStage = forwardRef<HTMLDivElement, EpubViewerStageProps>(
  ({ viewerId = "epub-viewer-stage" }, ref) => {
    return (
      <div className="epub-viewer-stage-container">
        <div id={viewerId} ref={ref} className="epub-viewer-stage" />
      </div>
    );
  }
);

EpubViewerStage.displayName = "EpubViewerStage";
