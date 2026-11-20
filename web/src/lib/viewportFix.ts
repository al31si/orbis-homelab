/** Only small height deficits in installed apps can be the iOS status-bar viewport bug. */
export function expectedAppHeight({
  standalone,
  innerHeight,
  screenWidth,
  screenHeight,
  portrait,
}: {
  standalone: boolean;
  innerHeight: number;
  screenWidth: number;
  screenHeight: number;
  portrait: boolean;
}): number | null {
  const expected = portrait
    ? Math.max(screenWidth, screenHeight)
    : Math.min(screenWidth, screenHeight);
  const gap = expected - innerHeight;
  return standalone && gap > 0 && gap <= 120 ? expected : null;
}

/** Fill the screen when an iOS Home Screen app reports a viewport short by the status bar. */
export function installViewportFix(): void {
  const standalone = (navigator as { standalone?: boolean }).standalone === true;
  if (!standalone) return;

  function update(): void {
    const height = expectedAppHeight({
      standalone,
      innerHeight: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      portrait: window.matchMedia('(orientation: portrait)').matches,
    });
    if (height === null) document.documentElement.style.removeProperty('--app-height');
    else document.documentElement.style.setProperty('--app-height', `${height}px`);
  }

  let pending = false;
  function schedule(): void {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(() => {
      pending = false;
      update();
    });
  }

  update();
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  window.addEventListener('pageshow', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
}
