# Reader Fixture Guidance

Use small local fixtures for automated reader checks:

- `text.pdf`: a one or two page PDF with selectable text for first-page render, progress, navigation, zoom, and highlighting checks.
- `scanned.pdf`: an image-only PDF page used to verify the scanned-page banner and disabled highlight creation for empty text layers.
- `broken.pdf`: a malformed PDF or mocked render failure case used to verify the render-error placeholder without breaking navigation.

For EPUB reader checks, use the following small generated EPUB fixtures:
- `normal.epub`: a standard reflowable EPUB containing clean HTML chapters, styling, and a valid NCX/OPF Table of Contents for rendering, progress saving, highlighting, ToC navigation, and font-size customization.
- `missing-toc.epub`: a valid EPUB zip containing readable chapters but lacking an NCX/OPF TOC metadata resource, used to verify previous/next fallback controls when navigation is missing.
- `invalid-cfi.epub`: used to verify CFI restoration error handling; should contain elements that cause saved CFI lookups to fail or be out-of-bounds, triggering recovery to the first chapter.
- `image-only.epub`: an EPUB containing only page-sized image resources without text, used to verify empty-selection handling and image rendering.
- `drm.epub`: a mock DRM-protected EPUB file (e.g. containing `rights.xml` or custom encryption tags in `META-INF/encryption.xml`) used to verify that the DRM unsupported banner displays and prevents render ungracefully.

Keep fixtures under the 200 MB upload limit. Avoid copyrighted book content; short generated documents are enough for reader behavior tests.
