const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  // `%` too, so a value can never form a `%%TOKEN%%` that looks like a template placeholder.
  '%': '&#37;',
};

/** Escapes text for an HTML text node or a quoted attribute value. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"'%]/g, (c) => ENTITIES[c] ?? c);
}
