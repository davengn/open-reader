export const epubReaderProgressScenarios = [
  "saves progress CFI to the database with a 1500 ms debounce after relocation in the book",
  "resumes reading at the exact saved CFI location upon reloading the EPUB reader page",
  "flushes progress immediately using keepalive or sendBeacon when navigating away or closing the tab before the debounce fires",
  "displays an invalid-CFI warning banner and falls back to the first chapter if the saved position CFI is invalid or cannot be loaded",
];
