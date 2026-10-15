/* Applies the saved theme and the instance accent before first paint (no flash). A classic
   external script so it works under a strict `script-src 'self'` policy. Reads the boot config the
   server embeds in <meta name="orbis-boot">. Mirrors src/lib/theme.ts, src/lib/accent.ts and
   the key rule of src/lib/prefs.ts (`<app.id>.prefs.v1`); lib/accent.test.ts keeps them in sync. */
/* global document, localStorage */
(function () {
  try {
    var meta = document.querySelector('meta[name="orbis-boot"]');
    var raw = meta ? meta.getAttribute('content') : null;
    if (!raw || raw.indexOf('%%') === 0) return;
    var app = JSON.parse(raw).app;
    if (!app || typeof app.id !== 'string') return;
    var root = document.documentElement;

    var stored = null;
    try {
      var saved = localStorage.getItem(app.id + '.prefs.v1');
      stored = saved ? JSON.parse(saved).theme : null;
    } catch {
      /* storage unavailable: use the instance default */
    }
    var known = ['auto', 'system', 'light', 'dark'];
    var theme = known.indexOf(stored) >= 0 ? stored : app.theme;
    if (theme === 'light' || theme === 'dark') {
      root.dataset.theme = theme;
      var color = theme === 'dark' ? '#0c1110' : '#e5e9e7';
      var metas = document.querySelectorAll('meta[name="theme-color"]');
      for (var i = 0; i < metas.length; i++) {
        metas[i].setAttribute('content', color);
      }
    }

    var hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(app.accent || '');
    if (hex) {
      var rgb = [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)];
      var lin = function (value) {
        var v = value / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      var lum = function (c) {
        return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
      };
      var ratio = function (a, b) {
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      var hexOf = function (c) {
        return (
          '#' +
          c
            .map(function (v) {
              var h = Math.round(v).toString(16);
              return h.length < 2 ? '0' + h : h;
            })
            .join('')
        );
      };
      var luminance = lum(rgb);
      var white = ratio(1, luminance);
      var dark = ratio(luminance, lum([4, 24, 47]));
      root.style.setProperty('--accent', hexOf(rgb));
      root.style.setProperty(
        '--accent-strong',
        hexOf(
          rgb.map(function (v) {
            return v * 0.82;
          }),
        ),
      );
      root.style.setProperty('--accent-soft', 'rgb(' + rgb.join(' ') + ' / 14%)');
      root.style.setProperty('--accent-fg', white >= dark ? '#ffffff' : '#04182f');
    }
  } catch {
    /* malformed boot data: the app boots with the built-in look */
  }
})();
