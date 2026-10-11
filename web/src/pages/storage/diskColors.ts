/** Strongest and faintest share of the accent colour used by the ramp. */
const STRONGEST = 100;
const FAINTEST = 28;

/**
 * One calm ramp of the accent colour, spread evenly over `count` items so that every item of a
 * group has its own tint and keeps it wherever it is shown. The first item is the pure accent.
 */
export function diskColor(index: number, count: number): string {
  const steps = Math.max(1, count - 1);
  const share = Math.round(STRONGEST - (Math.min(index, steps) / steps) * (STRONGEST - FAINTEST));
  return share >= STRONGEST
    ? 'var(--accent)'
    : `color-mix(in srgb, var(--accent) ${share}%, transparent)`;
}
