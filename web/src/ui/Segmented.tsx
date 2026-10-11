import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './Segmented.module.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group, e.g. "Tema". */
  ariaLabel: string;
  fullWidth?: boolean;
  className?: string;
}

/** iOS style segmented control (radio group with arrow-key navigation). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  fullWidth,
  className,
}: SegmentedProps<T>) {
  const group = useRef<HTMLDivElement>(null);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + step + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    group.current?.querySelectorAll<HTMLElement>('[role="radio"]')[options.indexOf(next)]?.focus();
  }

  return (
    <div
      ref={group}
      className={cx(styles.group, fullWidth && styles.full, className)}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={cx(styles.option, selected && styles.selected)}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
