import { describe, expect, it } from 'vitest';
import { parseRichText } from './RichText';

describe('parseRichText', () => {
  it('keeps plain text as one segment', () => {
    expect(parseRichText('Just text.')).toEqual([{ text: 'Just text.', style: 'plain' }]);
  });

  it('extracts code and bold segments in order', () => {
    expect(parseRichText('Set `A_KEY` in **services.yaml** now')).toEqual([
      { text: 'Set ', style: 'plain' },
      { text: 'A_KEY', style: 'code' },
      { text: ' in ', style: 'plain' },
      { text: 'services.yaml', style: 'bold' },
      { text: ' now', style: 'plain' },
    ]);
  });

  it('handles markup at both ends and adjacent markup', () => {
    expect(parseRichText('`a``b`')).toEqual([
      { text: 'a', style: 'code' },
      { text: 'b', style: 'code' },
    ]);
  });

  it('leaves an unmatched marker alone', () => {
    expect(parseRichText('50 ** 2 and a ` tick')).toEqual([
      { text: '50 ** 2 and a ` tick', style: 'plain' },
    ]);
  });
});
