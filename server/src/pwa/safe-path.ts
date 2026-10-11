/**
 * Validates a URL-derived relative file path before it is joined to a directory. Returns the
 * normalised path, or null when it could leave the directory or reach a hidden file: absolute
 * paths, `.`/`..`/empty segments, backslashes, NUL bytes and dotfiles are all refused.
 */
export function safeRelativePath(raw: string): string | null {
  if (raw === '' || raw.includes('\0') || raw.includes('\\') || raw.startsWith('/')) return null;
  const segments = raw.split('/');
  if (segments.some((s) => s === '' || s.startsWith('.'))) return null;
  return segments.join('/');
}
