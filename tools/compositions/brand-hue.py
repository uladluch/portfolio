#!/usr/bin/env python3
"""
Find a case's brand hue from its own screenshots.

    python3 tools/compositions/brand-hue.py "figma-exports/serene-ios" [...]

Prints the dominant hue in OKLCH degrees, which is what --brand-hue in
library.css expects. Backgrounds then sit at the same lightness as this
site's grey tokens, only tinted — so a case reads as its own product
without leaving the site's palette (the greys are themselves a hue-264 ramp
at very low chroma; a brand background is the same ramp, hue swapped and
chroma raised a notch).

Method: sample pixels, drop the near-neutral and the near-black/white ones,
then take a chroma-weighted circular mean of what is left. Weighting by
chroma matters — a screen is mostly off-white UI, and an unweighted average
of that is meaningless.

PARKED (2026-08-30). Nothing reads this: composition backgrounds went
back to the site's greys because the tinted ones were unreliable in
practice. Kept because the measurement itself was sound — it returned
285-301 across five independent sections of one app, and 292 for that
app's separate Android export.
"""
import math, sys, pathlib
from PIL import Image

SAMPLE = 64          # each image is thumbnailed to this before sampling
MIN_C  = 0.03        # below this a pixel is UI grey, not brand colour
L_RANGE = (0.15, 0.95)

def srgb_to_oklch(r, g, b):
    def lin(c):
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = lin(r), lin(g), lin(b)
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = l ** (1/3), m ** (1/3), s ** (1/3)
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    return L, math.hypot(A, B), math.degrees(math.atan2(B, A)) % 360

def main(roots):
    files = []
    for r in roots:
        p = pathlib.Path(r)
        files += sorted(p.rglob('*.png')) if p.is_dir() else [p]
    if not files:
        sys.exit('no images found')

    x = y = weight = 0.0
    counted = 0
    for f in files:
        try:
            im = Image.open(f).convert('RGB')
        except Exception:
            continue
        im.thumbnail((SAMPLE, SAMPLE))
        for px in im.getdata():
            L, C, H = srgb_to_oklch(*px)
            if C < MIN_C or not (L_RANGE[0] < L < L_RANGE[1]):
                continue
            rad = math.radians(H)
            x += C * math.cos(rad)
            y += C * math.sin(rad)
            weight += C
            counted += 1

    if not counted:
        sys.exit('every pixel read as neutral — no brand hue to find')

    hue = math.degrees(math.atan2(y, x)) % 360
    print(f'{hue:.0f}')
    print(f'  from {len(files)} image(s), {counted} chromatic pixels', file=sys.stderr)
    print(f'  set --brand-hue: {hue:.0f} in the composition spec', file=sys.stderr)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
