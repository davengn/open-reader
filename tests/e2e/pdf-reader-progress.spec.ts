export const pdfReaderProgressScenarios = [
  "navigates to page N, waits for the 1500 ms debounce, reloads, and resumes on page N",
  "navigates to page N, leaves the reader before the debounce fires, and resumes on page N",
  "updates the library progress summary with the same one-decimal percentage saved by the reader",
  "continues navigation without blocking when a progress save fails",
];
