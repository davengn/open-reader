export const epubReaderHighlightsScenarios = [
  "allows selecting reflowable EPUB text and triggers the color picker tooltip",
  "supports keyboard navigation (arrow keys/Enter/Escape) to select highlight colors (yellow, green, blue, pink)",
  "re-applies persisted highlights on document load and displays markers within the iframe",
  "displays delete tooltip when clicking on an existing highlight marker",
  "deletes the highlight from both SQLite and the iframe rendition when clicking the delete button in the tooltip",
  "disables text selection and highlight creation on image-only EPUB pages",
  "rejects cross-chapter text selections that span across multiple HTML files or spine items",
];
