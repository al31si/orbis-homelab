import { useLayoutEffect } from 'react';
import { useLocation } from 'wouter';
import { useShell } from './ShellContext';

const positions = new Map<string, number>();
const MAX_RESTORE_FRAMES = 30;

/** Keeps a scroll position per route: back from a detail page lands where you left. */
export function ScrollRestoration() {
  const [location] = useLocation();
  const { scroller } = useShell();

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const target = positions.get(location) ?? 0;
    let frame = 0;
    let raf = 0;
    // Lazy pages may not have their full height yet: retry for a few frames.
    function restore() {
      if (!element) return;
      element.scrollTo(0, target);
      if (Math.abs(element.scrollTop - target) > 2 && frame++ < MAX_RESTORE_FRAMES) {
        raf = requestAnimationFrame(restore);
      }
    }
    restore();

    const onScroll = () => positions.set(location, element.scrollTop);
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      element.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [location, scroller]);

  return null;
}
