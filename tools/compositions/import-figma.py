#!/usr/bin/env python3
"""
Turn a Figma mockup sheet's metadata into composition CSS.

    python3 tools/compositions/import-figma.py <metadata.json> <section> <prefix> <verified.txt>

Hand-transcribing coordinates is where this kind of work goes wrong: the
errors are small, plausible, and invisible until someone looks closely at
the right card. This reads the same numbers the design tool reports and
emits the CSS directly.

What it will and will not do:

  - A composition whose screens are unrotated is recovered exactly — x, y,
    width and height are the truth in the metadata.
  - It CANNOT tell whether a composition is rotated, so it refuses to guess:
    <verified.txt> is required, and only the node ids listed in it are
    emitted. That list comes from checking each parse against Figma's own
    render of the section — see verify-import.py, which scores every
    composition and draws the parse over the render so a mismatch can be
    seen rather than merely scored.

    Why the check is not optional. Two detectors were tried against the
    "UI Mockup For Dribbble and Behance" sheet and both were wrong:
    comparing a wrapper's origin to its child's split the set on coordinate
    space, not rotation; comparing the wrapper's bounding box to the child's
    size returned "flat" for a composition Figma renders at roughly 40
    degrees. The rotation simply is not in this metadata, in any derivable
    form. A pixel heuristic over the sheet's own render failed too — it
    measured the gaps between screens rather than the slope of their edges.

    So: treat the output as a draft. Every composition must be checked
    against Figma's own render of that node before it ships. The reliable
    source for rotation is get_design_context, which returns real
    transforms, at one call per composition.

Bare rounded rectangles sitting directly in a composition are the sheet's
own drop shadows; they are dropped, because `.screen` carries its shadow
in CSS.

Ids are generated as <prefix>-<count>-<shape><n>, where shape is read off
the vertical pattern (level / descend / rise / alt / mixed), so a name says
something about the layout rather than being an opaque number.
"""
import json, pathlib, re, sys, collections

def A(a, k):
    m = re.search(k + r'="([^"]*)"', a)
    return m.group(1) if m else ''

def F(v):
    try: return float(v)
    except (TypeError, ValueError): return None

def parse(path):
    xml = ''.join(x['text'] for x in json.load(open(path)))
    toks = re.finditer(r'<(/?)(\w+)([^>]*?)(/?)>', xml)
    comps, depth, sec, cur = [], 0, None, None
    for m in toks:
        close, tag, attrs, selfc = m.groups()
        if close:
            depth -= 1
            if depth == 2 and cur: comps.append(cur); cur = None
            continue
        if depth == 1:
            sec = A(attrs, 'name')
        elif depth == 2:
            cur = {'sec': sec, 'id': A(attrs, 'id'), 'kids': []}
        elif cur is not None and depth == 3:
            cur['kids'].append({'tag': tag, 'name': A(attrs, 'name'),
                                'x': F(A(attrs, 'x')), 'y': F(A(attrs, 'y')),
                                'w': F(A(attrs, 'width')), 'h': F(A(attrs, 'height')),
                                'inner': []})
        elif cur is not None and depth == 4 and cur['kids']:
            cur['kids'][-1]['inner'].append({'x': F(A(attrs, 'x')), 'y': F(A(attrs, 'y'))})
        if not selfc: depth += 1
    return comps

def is_rotated(k):
    """A wrapper whose contents start somewhere other than its own bounding
       box corner has been turned; the box is then not the shape."""
    for i in k['inner']:
        if None in (i['x'], i['y'], k['x'], k['y']): continue
        if abs(i['x'] - k['x']) > 1.5 or abs(i['y'] - k['y']) > 1.5: return True
    return False

def shape_of(ys):
    """Name the vertical pattern so the id carries meaning."""
    if len(ys) < 2: return 'one'
    span = max(ys) - min(ys)
    if span < 8: return 'level'
    d = [b - a for a, b in zip(ys, ys[1:])]
    if all(x > 4 for x in d): return 'descend'
    if all(x < -4 for x in d): return 'rise'
    if len(d) > 1 and all((a > 0) != (b > 0) for a, b in zip(d, d[1:])): return 'alt'
    return 'mixed'

def main(path, section, prefix, verified_path):
    allowed = set(pathlib.Path(verified_path).read_text().split())
    comps = parse(path)
    kept, skipped = [], 0
    for c in comps:
        if c['sec'] != section: continue
        screens = [k for k in c['kids']
                   if k['tag'] == 'frame' and k['w'] and k['name'] != 'Group']
        if not screens:
            skipped += 1; continue
        if c['id'] not in allowed:
            skipped += 1; continue
        # Figma lists children topmost-first; CSS paints later siblings on top.
        screens = list(reversed(screens))
        screens.sort(key=lambda k: k['x'])
        kept.append((c['id'], screens))

    used = collections.Counter()
    out = []
    for _id, screens in kept:
        shape = shape_of([round(k['y']) for k in screens])
        base = f"{prefix}-{len(screens)}-{shape}"
        used[base] += 1
        name = base if used[base] == 1 else f"{base}{used[base]}"
        out.append(f"/* {_id} */")
        for i, k in enumerate(screens, 1):
            out.append(
                f".comp--{name} .screen:nth-child({i}) {{ "
                f"left: {round(k['x'])}px; top: {round(k['y'])}px; "
                f"width: {round(k['w'])}px; height: {round(k['h'])}px; }}")
        out.append("")

    print('\n'.join(out))
    print(f"/* {len(kept)} compositions imported from \"{section}\"; "
          f"{skipped} skipped as unverified or empty */", file=sys.stderr)
    print(f"imported {len(kept)}, skipped {skipped}", file=sys.stderr)

if __name__ == '__main__':
    if len(sys.argv) != 5: sys.exit(__doc__)
    main(*sys.argv[1:])
