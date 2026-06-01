export const epubReaderFontSizeScenarios = [
  "displays a font size selection dropdown in the reader header showing active font size",
  "applies the selected font size to the rendition themes dynamically on user selection",
  "triggers text reflow when changing font size and preserves reading column width",
  "preserves the current reading location (CFI) after text reflow and font size changes",
  "persists the custom font size preference in localStorage under epub.fontSize",
  "restores the persisted font size preference from localStorage on reload of a book",
];
