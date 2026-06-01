/**
 * Validates if the given string is a syntactically valid EPUB CFI.
 * A valid EPUB CFI starts with "epubcfi(" and ends with ")".
 */
export function isValidCfi(cfi: unknown): cfi is string {
  if (typeof cfi !== "string") return false;
  const trimmed = cfi.trim();
  return trimmed.startsWith("epubcfi(") && trimmed.endsWith(")");
}

/**
 * Normalizes a CFI string. If it is already wrapped in epubcfi(), it returns it trimmed.
 * If it is unwrapped (e.g. "/6/4[chap-2]!/4/2/10/1:0"), it wraps it in "epubcfi(...)".
 */
export function normalizeCfi(cfi: string): string {
  const trimmed = cfi.trim();
  if (trimmed.startsWith("epubcfi(") && trimmed.endsWith(")")) {
    return trimmed;
  }
  // Try wrapping if it looks like a CFI path (starts with a slash)
  if (trimmed.startsWith("/")) {
    return `epubcfi(${trimmed})`;
  }
  return trimmed;
}
