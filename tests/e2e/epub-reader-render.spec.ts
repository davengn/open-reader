export const epubReaderRenderScenarios = [
  "opens a ready EPUB from the library and streams /api/books/[id]/file as application/epub+zip",
  "renders first EPUB chapter in an iframe-backed rendition",
  "adjusts layout and reflows text dynamically on viewport resize without horizontal scrollbars",
  "allows closing the reader to return back to the library view",
  "displays empty-selection state and images for image-only EPUB pages",
  "surfaces DRM-unsupported warning when opening an encrypted/protected EPUB file",
];
