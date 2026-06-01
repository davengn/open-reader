"use client";

import type { EpubTocItem } from "@/lib/types/reader";
import { useEffect, useRef } from "react";

type EpubTocPanelProps = {
  toc: EpubTocItem[];
  onSelect: (href: string) => void;
  activeHref?: string | null;
  isOpen: boolean;
  onClose: () => void;
};

export function EpubTocPanel({ toc, onSelect, activeHref, isOpen, onClose }: EpubTocPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Escape key to dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <aside
      className={`epub-toc-panel ${isOpen ? "open" : ""}`}
      ref={panelRef}
      role="navigation"
      aria-label="Table of contents"
      style={{ display: isOpen ? undefined : "none" }}
    >
      <div className="epub-toc-heading">Table of Contents</div>
      <ul className="epub-toc-list">
        {toc.map((item) => {
          // Check if active (we match the href base, ignoring optional hash anchors if matching coarsely)
          const cleanActive = activeHref ? activeHref.split("#")[0] : "";
          const cleanItemHref = item.href.split("#")[0];
          const isActive = cleanActive === cleanItemHref;

          return (
            <li key={item.id}>
              <button
                type="button"
                className={`epub-toc-item depth-${item.depth ?? 0} ${isActive ? "active" : ""}`}
                onClick={() => onSelect(item.href)}
                title={item.label}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
