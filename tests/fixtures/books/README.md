# Reader Fixture Guidance

Use small local fixtures for automated reader checks:

- `text.pdf`: a one or two page PDF with selectable text for first-page render, progress, navigation, zoom, and highlighting checks.
- `scanned.pdf`: an image-only PDF page used to verify the scanned-page banner and disabled highlight creation for empty text layers.
- `broken.pdf`: a malformed PDF or mocked render failure case used to verify the render-error placeholder without breaking navigation.

Keep fixtures under the 200 MB upload limit. Avoid copyrighted book content; short generated documents are enough for reader behavior tests.
