import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectedAppHeight, installViewportFix } from './viewportFix';

const iphone = {
  standalone: true,
  innerHeight: 793,
  screenWidth: 393,
  screenHeight: 852,
  portrait: true,
};

describe('expectedAppHeight', () => {
  it('restores the screen height for an iPhone portrait viewport short by the status bar', () => {
    expect(expectedAppHeight(iphone)).toBe(852);
  });

  it('does not correct a viewport with no gap or one taller than the screen', () => {
    expect(expectedAppHeight({ ...iphone, innerHeight: 852 })).toBeNull();
    expect(expectedAppHeight({ ...iphone, innerHeight: 853 })).toBeNull();
  });

  it('accepts a deficit of exactly 120px', () => {
    expect(expectedAppHeight({ ...iphone, innerHeight: 732 })).toBe(852);
  });

  it('rejects deficits over 120px, including iPad split view', () => {
    expect(expectedAppHeight({ ...iphone, innerHeight: 731 })).toBeNull();
    expect(
      expectedAppHeight({ ...iphone, screenWidth: 1024, screenHeight: 1366, innerHeight: 900 }),
    ).toBeNull();
  });

  it('does not correct browser tabs or other apps that are not standalone', () => {
    expect(expectedAppHeight({ ...iphone, standalone: false })).toBeNull();
  });

  it.each([
    [393, 852],
    [852, 393],
  ])(
    'uses the short side in landscape with screen dimensions %i × %i',
    (screenWidth, screenHeight) => {
      expect(
        expectedAppHeight({
          ...iphone,
          portrait: false,
          screenWidth,
          screenHeight,
          innerHeight: 372,
        }),
      ).toBe(393);
    },
  );

  it('uses the long side in portrait even if screen dimensions are swapped', () => {
    expect(expectedAppHeight({ ...iphone, screenWidth: 852, screenHeight: 393 })).toBe(852);
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('installViewportFix', () => {
  it.each([false, undefined])('does nothing when navigator.standalone is %s', (standalone) => {
    vi.stubGlobal('navigator', { standalone });
    // Browser globals are deliberately absent: the guard must return before touching them.
    expect(() => installViewportFix()).not.toThrow();
  });

  it('applies immediately, throttles viewport events and removes a correction that no longer fits', () => {
    const appWindow = Object.assign(new EventTarget(), {
      innerHeight: 793,
      screen: { width: 393, height: 852 },
      matchMedia: vi.fn(() => ({ matches: true })),
      visualViewport: new EventTarget(),
      requestAnimationFrame: vi.fn<(callback: FrameRequestCallback) => number>(),
    });
    const style = { setProperty: vi.fn(), removeProperty: vi.fn() };
    vi.stubGlobal('navigator', { standalone: true });
    vi.stubGlobal('window', appWindow);
    vi.stubGlobal('document', { documentElement: { style } });

    installViewportFix();
    expect(style.setProperty).toHaveBeenLastCalledWith('--app-height', '852px');
    expect(appWindow.matchMedia).toHaveBeenCalledWith('(orientation: portrait)');

    const flushFrame = () => {
      const calls = appWindow.requestAnimationFrame.mock.calls;
      calls[calls.length - 1]![0](0);
    };
    appWindow.innerHeight = 852;
    for (const event of ['resize', 'orientationchange', 'pageshow']) {
      appWindow.dispatchEvent(new Event(event));
    }
    appWindow.visualViewport.dispatchEvent(new Event('resize'));
    expect(appWindow.requestAnimationFrame).toHaveBeenCalledTimes(1);
    flushFrame();
    expect(style.removeProperty).toHaveBeenCalledWith('--app-height');

    // Each event must also schedule independently once the previous frame has finished.
    appWindow.innerHeight = 793;
    for (const event of ['resize', 'orientationchange', 'pageshow']) {
      appWindow.dispatchEvent(new Event(event));
      flushFrame();
    }
    appWindow.visualViewport.dispatchEvent(new Event('resize'));
    flushFrame();
    expect(appWindow.requestAnimationFrame).toHaveBeenCalledTimes(5);
    expect(style.setProperty).toHaveBeenCalledTimes(5);

    appWindow.innerHeight = 600;
    appWindow.dispatchEvent(new Event('resize'));
    flushFrame();
    expect(style.removeProperty).toHaveBeenCalledTimes(2);
  });
});
