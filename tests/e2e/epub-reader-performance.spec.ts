export const epubReaderPerformanceScenarios = [
  "renders the first readable EPUB chapter within 2 seconds for a local EPUB file of up to 30 MB",
  "renders subsequent chapter navigation within 500 ms after the EPUB book is loaded",
  "saves relocations debounced by 1500 ms to prevent database thrashing under fast scrolling",
  "loads the ToC and applies highlights concurrently without blocking initial reader paint",
];
