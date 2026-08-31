#!/usr/bin/env python3
"""
Render a case's composition figures.

    python3 tools/compose.py <slug>

Reads content/portfolio/<slug>.compositions.yaml, renders each entry, and
writes assets/projects/<slug>/<id>.webp — the id being the placeholder id
the case study already declares, so the figure simply appears in place of
its grey block on the next build.

Geometry is read from tools/compositions/library.css, not restated here.
The stylesheet is the one source of truth for where screens sit: the
catalogue and the rendered figure are then guaranteed to agree, and a
layout is fixed in one place. (A browser would have been the obvious
renderer, but there is no Chrome on this machine and Pillow can do this
particular job exactly: rounded corners, a soft shadow, rotation, and a
top-anchored cover crop.)

Rendered at 2x and downsampled, which is what keeps the corners and the
shadow clean.
"""
import math, pathlib, re, sys
import yaml
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSS = ROOT / 'tools' / 'compositions' / 'library.css'
SS = 2                      # supersampling factor
SHADOW = ((100, 100), 75, (52, 64, 84), 0.12)   # offset, blur, rgb, alpha

# ------------------------------------------------------------------ css --

def _decls(block):
    return dict(re.findall(r'([-\w]+)\s*:\s*([^;]+);', block))

def read_css():
    """Pull the family defaults, per-composition overrides and screen
       positions out of the stylesheet."""
    css = CSS.read_text()
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)

    fam, comp, screens = {}, {}, {}
    for sel, block in re.findall(r'([^{}]+)\{([^{}]*)\}', css):
        d = _decls(block)
        if not d: continue
        for s in (x.strip() for x in sel.split(',')):
            m = re.fullmatch(r'\.comp--([\w-]+)', s)
            if m:
                (fam if m.group(1) in ('m', 'w', 'u') else comp).setdefault(m.group(1), {}).update(d)
                continue
            m = re.fullmatch(r'\.comp--([\w-]+)\s+\.screen:nth-child\((\d+)\)', s)
            if m:
                screens.setdefault(m.group(1), {}).setdefault(int(m.group(2)), {}).update(d)
    base = {}
    for sel, block in re.findall(r'(\.comp)\s*\{([^{}]*)\}', css):
        base.update(_decls(block))
    return base, fam, comp, screens

def px(v, default=None):
    if v is None: return default
    m = re.search(r'(-?[\d.]+)px', str(v))
    return float(m.group(1)) if m else default

def angle_of(v):
    m = re.search(r'rotate\((-?[\d.]+)deg\)', str(v or ''))
    return float(m.group(1)) if m else 0.0

# --------------------------------------------------------------- render --

def rounded(size, radius, fill=255):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=fill)
    return m

def cover(path, size, align='top'):
    """Fill the box, keeping the screen's proportion.

       Anchored to the top by default — a long screen keeps its opening and
       loses its tail, which is how a real screen reads. `bottom` is for a
       modal presented over a dimmed backdrop: anchored top, such a screen
       shows mostly the dark area above the sheet."""
    im = Image.open(path).convert('RGB')
    tw, th = size
    s = max(tw / im.width, th / im.height)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    x = (im.width - tw) // 2
    y = {'top': 0, 'center': (im.height - th) // 2, 'bottom': im.height - th}[align]
    return im.crop((x, y, x + tw, y + th))

def render(entry, palette):
    base, fam, comp, screens = read_css()
    cid = entry['composition']
    if cid not in screens:
        raise SystemExit(f'unknown composition: {cid}')

    family = entry.get('family', 'm')
    style = {}
    style.update(base)
    style.update(fam.get(family, {}))
    style.update(comp.get(cid, {}))

    cw = int(float(style.get('--comp-w', 1600))) * SS
    ch = int(float(style.get('--comp-h', 1200))) * SS
    dw = px(style.get('--screen-w'), 450) * SS
    dh = px(style.get('--screen-h'), 974) * SS
    radius = int(px(style.get('--screen-radius'), 8) * SS)

    bg = palette[entry.get('background', 'brand-surface')]
    canvas = Image.new('RGB', (cw, ch), bg)

    (ox, oy), blur, scol, salpha = SHADOW
    paths = entry['screens']
    a = entry.get('align', 'top')
    aligns = a if isinstance(a, list) else [a] * len(paths)
    for i in sorted(screens[cid]):
        d = screens[cid][i]
        src = paths[(i - 1) % len(paths)]
        w = int(px(d.get('width'), dw / SS) * (SS if 'width' in d else 1))
        h = int(px(d.get('height'), dh / SS) * (SS if 'height' in d else 1))
        if 'width' not in d: w = int(dw)
        if 'height' not in d: h = int(dh)
        x, y = int(px(d.get('left'), 0) * SS), int(px(d.get('top'), 0) * SS)
        ang = angle_of(d.get('transform'))

        shot = cover(ROOT / src, (w, h), aligns[(i - 1) % len(aligns)])
        mask = rounded((w, h), radius)

        layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        layer.paste(shot, (0, 0), mask)

        # The shadow layer is padded before blurring: blurred on a canvas its
        # own size, the blur is clipped at the edges and the result reads as
        # a hard offset rectangle rather than a soft cast.
        pad = int(blur * SS)
        sh = Image.new('RGBA', (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
        sh.paste(Image.new('RGB', (w, h), scol), (pad, pad),
                 rounded((w, h), radius, fill=int(255 * salpha)))

        if ang:
            layer = layer.rotate(-ang, resample=Image.BICUBIC, expand=True)
            sh = sh.rotate(-ang, resample=Image.BICUBIC, expand=True)
        # CSS blur-radius is about twice the Gaussian sigma.
        sh = sh.filter(ImageFilter.GaussianBlur(blur * SS / 2))

        cx, cy = x + w // 2, y + h // 2
        canvas.paste(sh, (cx - sh.width // 2 + ox * SS,
                          cy - sh.height // 2 + oy * SS), sh)
        canvas.paste(layer, (cx - layer.width // 2, cy - layer.height // 2), layer)

    return canvas.resize((cw // SS, ch // SS), Image.LANCZOS)

# ----------------------------------------------------------------- main --

def palette_for(_slug):
    """The site's greys. A per-case tinted ramp used to be derived from a
       declared brandColor and read in here; it was removed on 2026-08-30 for
       being unreliable. Compositions are a neutral ground — the colour comes
       from the screens standing on it."""
    return {'bg': '#f9fafb', 'surface': '#f3f4f6', 'sunken': '#e5e7eb', 'ink': '#111827'}

def main(slug):
    spec_path = ROOT / 'content' / 'portfolio' / f'{slug}.compositions.yaml'
    if not spec_path.exists(): raise SystemExit(f'no spec: {spec_path}')
    spec = yaml.safe_load(spec_path.read_text())
    out_dir = ROOT / 'assets' / 'projects' / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    palette = palette_for(slug)

    for pid, entry in spec.items():
        missing = [p for p in entry['screens'] if not (ROOT / p).exists()]
        if missing:
            print(f'  ! {pid}: missing {missing[0]}'); continue
        img = render(entry, palette)
        out = out_dir / f'{pid}.webp'
        img.save(out, 'WEBP', quality=82, method=6)
        print(f'  ✓ {pid}  {entry["composition"]}  {img.width}x{img.height}  '
              f'{out.stat().st_size // 1024}KB')

if __name__ == '__main__':
    if len(sys.argv) != 2: sys.exit(__doc__)
    main(sys.argv[1])
