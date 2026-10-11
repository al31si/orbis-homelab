#!/usr/bin/env python3
"""Generate the PWA brand assets (icons and iOS launch images) of an Orbis Homelab instance.

Without arguments it draws the built-in neutral mark and writes the default set that ships in
`web/public/`. For your own branding pass your emblem and an output folder, then mount that
folder as `<config>/branding/` (the server serves it before the built-in files):

  python3 web/scripts/generate-brand-assets.py --emblem my-logo.png --out ./config/branding

Outputs (relative to --out):
  icons/icon-192.png, icons/icon-512.png     manifest icons (purpose "any")
  icons/icon-maskable-512.png                full-bleed, emblem inside the 80% safe zone
  icons/apple-touch-icon.png                 180x180, full-bleed (iOS rounds the corners)
  icons/favicon-32.png                       browser tab icon
  icons/emblem.png                           transparent emblem used by the in-app brand mark
  splash/<w>x<h>.png                         apple-touch-startup-image, background + emblem

The emblem is a PNG with a transparent background (it is cropped to its visible area).
Pillow is the only dependency; use a throwaway virtual environment, nothing is installed globally:

  python3 -m venv /tmp/orbis-venv && /tmp/orbis-venv/bin/pip install pillow
  /tmp/orbis-venv/bin/python web/scripts/generate-brand-assets.py [options]
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

PUBLIC = Path(__file__).resolve().parent.parent / 'public'

# Defaults follow the dark theme tokens (tokens.css): deep navy with a cool accent.
DEFAULT_BG_TOP = '#0b1e3a'
DEFAULT_BG_BOTTOM = '#060e1c'
DEFAULT_SPLASH_BG = '#070e1b'
DEFAULT_ACCENT = '#3aa6e0'

# (css width, css height, device pixel ratio): portrait launch images of current iPhones/iPads.
SPLASH_SIZES = [
    (375, 667, 2),  # iPhone SE / 8
    (390, 844, 3),  # iPhone 12 / 13 / 14 / 12 Pro
    (393, 852, 3),  # iPhone 15 / 16 / 15 Pro
    (430, 932, 3),  # iPhone 14 Pro Max / 15 Plus / 16 Plus
    (810, 1080, 2),  # iPad 10.2"
    (820, 1180, 2),  # iPad Air / iPad 10th gen
    (834, 1194, 2),  # iPad Pro 11"
    (1024, 1366, 2),  # iPad Pro 12.9"
]

SUPERSAMPLE = 4


def hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip('#')
    if len(value) != 6:
        raise SystemExit(f'colors must be #rrggbb, got "#{value}"')
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


def default_emblem(accent: tuple[int, int, int], size: int = 1024) -> Image.Image:
    """An orb with a tilted orbital ring and one satellite: the mark of Orbis Homelab.

    Drawn from scratch with primitive shapes (a disc, two ellipses, a dot): no third-party artwork.
    The ring passes behind the upper half of the orb and in front of the lower half.
    """
    s = size * SUPERSAMPLE
    light = (234, 242, 250, 255)
    bright = accent + (255,)
    shade = tuple(round(c * 0.55) for c in accent) + (255,)
    cx = cy = s / 2

    def disc(layer: Image.Image, radius: float, fill: tuple, dx: float = 0.0, dy: float = 0.0) -> None:
        r = radius * s
        ImageDraw.Draw(layer).ellipse((cx + dx * s - r, cy + dy * s - r, cx + dx * s + r, cy + dy * s + r), fill=fill)

    # the orb: a shaded disc, the lit side towards the top left
    orb = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    disc(orb, 0.27, shade)
    lit = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    disc(lit, 0.27, bright)
    mask = Image.new('L', (s, s), 0)
    ImageDraw.Draw(mask).ellipse((cx - 0.27 * s - 0.06 * s, cy - 0.27 * s - 0.06 * s, cx + 0.27 * s - 0.06 * s, cy + 0.27 * s - 0.06 * s), fill=255)
    orb.paste(lit, (0, 0), ImageChops.multiply(mask, lit.getchannel('A')))

    # the ring and the satellite, drawn upright then tilted
    ring = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rx, ry, width = 0.43 * s, 0.14 * s, 0.032 * s
    rd.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), outline=light, width=round(width))
    satellite_r = 0.045 * s
    sx, sy = cx + rx * 0.80, cy + ry * 0.60  # on the ring, lower right, in front of the orb
    rd.ellipse((sx - satellite_r, sy - satellite_r, sx + satellite_r, sy + satellite_r), fill=bright)
    front = Image.new('L', (s, s), 0)
    ImageDraw.Draw(front).rectangle((0, cy, s, s), fill=255)  # lower half of the ring: in front
    tilt = 24
    ring = ring.rotate(tilt, resample=Image.BICUBIC, center=(cx, cy))
    front = front.rotate(tilt, resample=Image.BICUBIC, center=(cx, cy))

    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    behind = ring.copy()
    behind.putalpha(ImageChops.multiply(ring.getchannel('A'), ImageChops.invert(front)))
    ahead = ring.copy()
    ahead.putalpha(ImageChops.multiply(ring.getchannel('A'), front))
    img.alpha_composite(behind)
    img.alpha_composite(orb)
    img.alpha_composite(ahead)
    return img.resize((size, size), Image.LANCZOS)


def load_emblem(path: Path) -> Image.Image:
    src = Image.open(path).convert('RGBA')
    bbox = src.getchannel('A').getbbox()
    if bbox is None:
        raise SystemExit(f'{path} is fully transparent')
    return src.crop(bbox)


def crop_visible(image: Image.Image) -> Image.Image:
    bbox = image.getchannel('A').getbbox()
    return image.crop(bbox) if bbox else image


def vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    w, h = size
    ramp = Image.linear_gradient('L').resize((w, h))  # black -> white, top to bottom
    return Image.composite(Image.new('RGB', (w, h), bottom), Image.new('RGB', (w, h), top), ramp).convert('RGBA')


def paste_emblem(canvas: Image.Image, emblem: Image.Image, height: int, center_y: float = 0.5) -> None:
    width = round(emblem.width * height / emblem.height)
    scaled = emblem.resize((width, height), Image.LANCZOS)
    x = (canvas.width - width) // 2
    y = round(canvas.height * center_y - height / 2)
    canvas.alpha_composite(scaled, (x, y))


def app_icon(emblem: Image.Image, size: int, ratio: float, top: tuple, bottom: tuple) -> Image.Image:
    canvas = vertical_gradient((size, size), top, bottom)
    paste_emblem(canvas, emblem, round(size * ratio))
    return canvas


def splash(emblem: Image.Image, width: int, height: int, background: tuple, glow: tuple) -> Image.Image:
    canvas = Image.new('RGBA', (width, height), background + (255,))
    radius = round(min(width, height) * 0.55)
    halo = Image.new('L', (radius * 2, radius * 2), 0)
    ImageDraw.Draw(halo).ellipse((radius * 0.5, radius * 0.5, radius * 1.5, radius * 1.5), fill=40)
    halo = halo.filter(ImageFilter.GaussianBlur(radius * 0.25))
    tint = Image.new('RGBA', halo.size, glow + (0,))
    tint.putalpha(halo)
    canvas.alpha_composite(tint, ((width - radius * 2) // 2, round(height * 0.46) - radius))
    paste_emblem(canvas, emblem, round(min(height * 0.28, width * 0.5)), center_y=0.46)
    return canvas


def save_png(image: Image.Image, path: Path, root: Path, flatten: bool = True) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    (image.convert('RGB') if flatten else image).save(path, optimize=True)
    print(f'{path.relative_to(root)}  {path.stat().st_size / 1024:.0f} KB')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    parser.add_argument('--emblem', type=Path, help='transparent PNG; default: the built-in neutral mark')
    parser.add_argument('--out', type=Path, default=PUBLIC, help='output folder (default: web/public)')
    parser.add_argument('--accent', default=DEFAULT_ACCENT, help='accent of the built-in mark and the splash glow')
    parser.add_argument('--bg-top', default=DEFAULT_BG_TOP, help='top color of the app icon background')
    parser.add_argument('--bg-bottom', default=DEFAULT_BG_BOTTOM, help='bottom color of the app icon background')
    parser.add_argument('--splash-bg', default=DEFAULT_SPLASH_BG, help='background of the launch images')
    args = parser.parse_args()

    accent, top, bottom, splash_bg = map(hex_rgb, (args.accent, args.bg_top, args.bg_bottom, args.splash_bg))
    emblem = load_emblem(args.emblem) if args.emblem else crop_visible(default_emblem(accent))
    out: Path = args.out

    icons = out / 'icons'
    save_png(app_icon(emblem, 512, 0.62, top, bottom), icons / 'icon-512.png', out)
    save_png(app_icon(emblem, 192, 0.62, top, bottom), icons / 'icon-192.png', out)
    save_png(app_icon(emblem, 512, 0.5, top, bottom), icons / 'icon-maskable-512.png', out)
    save_png(app_icon(emblem, 180, 0.62, top, bottom), icons / 'apple-touch-icon.png', out)
    save_png(app_icon(emblem, 32, 0.7, top, bottom), icons / 'favicon-32.png', out)

    brand = emblem.copy()
    brand.thumbnail((192, 192), Image.LANCZOS)
    save_png(brand, icons / 'emblem.png', out, flatten=False)

    for w, h, ratio in SPLASH_SIZES:
        save_png(splash(emblem, w * ratio, h * ratio, splash_bg, accent), out / 'splash' / f'{w * ratio}x{h * ratio}.png', out)


if __name__ == '__main__':
    main()
