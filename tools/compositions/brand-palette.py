#!/usr/bin/env python3
"""
Derive a case's colour ramp from one brand colour.

    python3 tools/compositions/brand-palette.py <#hex> <slug>

Give it the single colour a case declares as `brandColor` in its
frontmatter; it writes tools/compositions/brands/<slug>.css.

How the ramp is built, and why this way: measured in OKLCH this site's
greys are already a ramp of one hue (264) at low chroma. A brand ramp is
therefore not a different kind of thing — it is the same ramp with the hue
swapped and the chroma scaled up. So:

  - lightness is copied exactly from gray-50..950, step for step, which is
    what lets a brand colour swap in anywhere a grey was without changing
    how heavy the page feels;
  - hue comes from the given colour;
  - chroma keeps the grey ramp's own shape, multiplied by a single factor
    chosen so the step nearest the given colour's lightness reproduces that
    colour. The colour you hand it is in the ramp, not merely near it.

Out-of-gamut steps (deep saturated darks) have their chroma reduced until
they fit sRGB, rather than being clipped per channel, which would shift
their hue.

PARKED (2026-08-30). Nothing reads the ramps this writes: composition
backgrounds went back to the site's greys. Kept in case a per-case colour
is worth another attempt — the derivation (grey-ramp lightness, declared
hue, chroma scaled so the declared colour lands in the ramp) is the part
worth keeping.
"""
import math, sys, pathlib

# gray-50..950: the site's own ramp, measured.
GREY = [
    (50,  0.9846, 0.0017), (100, 0.9670, 0.0029), (200, 0.9276, 0.0058),
    (300, 0.8717, 0.0093), (400, 0.7137, 0.0192), (500, 0.5510, 0.0234),
    (600, 0.4461, 0.0263), (700, 0.3729, 0.0306), (800, 0.2781, 0.0296),
    (900, 0.2101, 0.0318), (950, 0.1296, 0.0274),
]

def _lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hex_to_oklch(h):
    r, g, b = (_lin(int(h[i:i+2], 16)) for i in (1, 3, 5))
    l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b
    m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b
    s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b
    l_, m_, s_ = l**(1/3), m**(1/3), s**(1/3)
    L = 0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_
    A = 1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_
    B = 0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_
    return L, math.hypot(A, B), math.degrees(math.atan2(B, A)) % 360

def oklch_to_rgb(L, C, H):
    a, b = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    l_ = L + 0.3963377774*a + 0.2158037573*b
    m_ = L - 0.1055613458*a - 0.0638541728*b
    s_ = L - 0.0894841775*a - 1.2914855480*b
    l, m, s = l_**3, m_**3, s_**3
    return (4.0767416621*l - 3.3077115913*m + 0.2309699292*s,
           -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,
           -0.0041960863*l - 0.7034186147*m + 1.7076147010*s)

def in_gamut(rgb):
    return all(-1e-4 <= c <= 1 + 1e-4 for c in rgb)

def to_hex(L, C, H):
    """Reduce chroma until the colour fits sRGB — never clip channels, which
       would drag the hue somewhere else."""
    lo, hi = 0.0, C
    if not in_gamut(oklch_to_rgb(L, C, H)):
        for _ in range(40):
            mid = (lo + hi) / 2
            if in_gamut(oklch_to_rgb(L, mid, H)): lo = mid
            else: hi = mid
        C = lo
    def enc(c):
        c = min(1.0, max(0.0, c))
        c = 12.92*c if c <= 0.0031308 else 1.055*(c**(1/2.4)) - 0.055
        return round(c * 255)
    r, g, b = (enc(c) for c in oklch_to_rgb(L, C, H))
    return f'#{r:02x}{g:02x}{b:02x}', C

def main(brand_hex, slug):
    brand_hex = brand_hex if brand_hex.startswith('#') else '#' + brand_hex
    L0, C0, H = hex_to_oklch(brand_hex)

    anchor = min(GREY, key=lambda g: abs(g[1] - L0))
    k = C0 / anchor[2]

    rows = []
    for step, L, Cg in GREY:
        hexv, Cout = to_hex(L, Cg * k, H)
        # The anchor step is the given colour verbatim: a round trip through
        # OKLCH lands a channel or two away, and the colour a case declares
        # should appear in its ramp exactly, not approximately.
        if step == anchor[0]:
            hexv, Cout = brand_hex.lower(), C0
        rows.append((step, hexv, L, Cout, Cout < Cg * k - 1e-4))

    print(f'{brand_hex}  ->  L={L0:.4f}  C={C0:.4f}  H={H:.1f}')
    print(f'anchored on gray-{anchor[0]} (L={anchor[1]:.4f}); chroma x{k:.2f}\n')
    for step, hexv, L, C, clipped in rows:
        mark = '  <- your colour' if step == anchor[0] else ''
        note = '  (chroma reduced to fit sRGB)' if clipped else ''
        print(f'  brand-{step:<4} {hexv}   L={L:.4f} C={C:.4f}{mark}{note}')

    out = pathlib.Path(__file__).parent / 'brands' / f'{slug}.css'
    lines = [f'/* {slug} — generated from brandColor {brand_hex} by brand-palette.py.',
             f'   Lightness copied from the site\'s grey ramp step for step; hue {H:.0f};',
             f'   chroma is the grey ramp\'s own shape x{k:.2f}, set so brand-{anchor[0]} is',
             f'   exactly the colour given. Do not edit — re-run the script. */',
             f'.brand-{slug} {{',
             f'  --brand-hue: {H:.0f};']
    lines += [f'  --brand-{s}: {h};' for s, h, *_ in rows]
    lines += ['',
              '  /* the three a composition background can use, mirroring',
              '     --bg / --surface / --surface-sunken */',
              '  --brand-bg: var(--brand-50);',
              '  --brand-surface: var(--brand-100);',
              '  --brand-sunken: var(--brand-200);',
              '}']
    out.write_text('\n'.join(lines) + '\n')
    print(f'\nwritten: {out.relative_to(pathlib.Path.cwd()) if str(out).startswith(str(pathlib.Path.cwd())) else out}')

if __name__ == '__main__':
    if len(sys.argv) != 3: sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
