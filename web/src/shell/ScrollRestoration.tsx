import { useLayoutEffect } from 'react';
import { useLocation } from 'wouter';

const positions = new Map<string, number>();
const MAX_RESTORE_FRAMES = 30;

/** Keeps a scroll position per route: back from a detail page lands where you left. */
export function ScrollRestoration() {
  const [location] = useLocation();

  useLayoutEffect(() => {
    const target = positions.get(location) ?? 0;
    let frame = 0;
    let raf = 0;
    // Lazy pages may not have their full height yet: retry for a few frames.
    function restore() {
      window.scrollTo(0, target);
      if (Math.abs(window.scrollY - target) > 2 && frame++ < MAX_RESTORE_FRAMES) {
        raf = requestAnimationFrame(restore);
      }
    }
    restore();

    const onScroll = () => positions.set(location, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [location]);

  return null;
}
