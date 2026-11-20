const WORD_SPLIT = /[^\p{L}\p{N}]+/u;

/**
 * Up to two uppercase letters standing for a service name: the first letters of the first two
 * words ("Home Assistant" -> "HA"), or the first letter of a single word. Empty when the name
 * has no letter or digit.
 */
export function monogram(label: string): string {
  const words = label.split(WORD_SPLIT).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => [...word][0] ?? '');
  return (words.length > 1 ? letters.join('') : (letters[0] ?? '')).toLocaleUpperCase();
}
