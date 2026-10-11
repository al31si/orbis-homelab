import { Fragment } from 'react';

export interface RichSegment {
  text: string;
  style: 'plain' | 'code' | 'bold';
}

const MARKUP = /(`[^`]+`|\*\*[^*]+\*\*)/;

/**
 * Splits a translated message into plain, `code` and **bold** segments. Messages stay one
 * sentence per key (translators can reorder freely) while the UI still gets inline emphasis.
 */
export function parseRichText(text: string): RichSegment[] {
  // `split` with one capture group alternates plain text (even) and markup (odd).
  return text.split(MARKUP).flatMap((part, index): RichSegment[] => {
    if (part === '') return [];
    if (index % 2 === 0) return [{ text: part, style: 'plain' }];
    return part.startsWith('`')
      ? [{ text: part.slice(1, -1), style: 'code' }]
      : [{ text: part.slice(2, -2), style: 'bold' }];
  });
}

/** Renders a message that uses `code` and **bold** markup. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {parseRichText(text).map((segment, index) => (
        <Fragment key={index}>
          {segment.style === 'code' ? (
            <code>{segment.text}</code>
          ) : segment.style === 'bold' ? (
            <strong>{segment.text}</strong>
          ) : (
            segment.text
          )}
        </Fragment>
      ))}
    </>
  );
}
