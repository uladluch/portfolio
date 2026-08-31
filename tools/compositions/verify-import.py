#!/usr/bin/env python3
"""
Check an import against Figma's own render, and write the pass-list.

Needed because rotation is absent from get_metadata: a rotated screen is
reported by its axis-aligned bounding box, so a parse that trusts the
metadata draws an upright rectangle where the design has a tilted one. That
error looks plausible on paper. It only shows up against the render.

Three numbers per composition:

  iou    the parsed rectangles against the render's mask of bright pixels.
         Rotation destroys it — a verified-rotated composition scored .09
         where verified-flat ones scored .77 and .82.
  mine   how much of the cell the parsed rectangles claim. A rotated
         screen's bounding box is far larger than the screen, so this goes
         to 1.00; correct parses sit at .68-.88. This is what caught four
         compositions that iou alone had passed, because their cell was
         nearly as bright as the screens and the masks overlapped by luck.
  cover  how much of the cell the render's own mask claims — a sanity check
         on the threshold having separated anything at all.

It also writes an overlay sheet drawing each parse over its render, because
the numbers are a filter and the picture is the actual check: the four false
passes above were obvious at a glance long before a metric explained them.

Inputs are the section renders, fetched once via get_screenshot at a size
giving roughly 300px per composition, and the saved get_metadata output.
"""

import json, re, statistics
from PIL import Image, ImageDraw

S='/private/tmp/claude-501/-Users-uladluch-Developer-portfolio/9f0faffa-6f3a-4af6-a6fa-8f312cdbeb42/scratchpad/mockups3'
META='/Users/uladluch/.claude/projects/-Users-uladluch-Developer-portfolio/9f0faffa-6f3a-4af6-a6fa-8f312cdbeb42/tool-results/mcp-818861fc-0862-4624-b58a-35906b10123e-get_metadata-1788076954991.txt'
def A(a,k):
    m=re.search(k+r'="([^"]*)"',a); return m.group(1) if m else ''
def F(v):
    try: return float(v)
    except: return None
xml=''.join(x['text'] for x in json.load(open(META)))
comps=[];depth=0;sec=None;cur=None
for m in re.finditer(r'<(/?)(\w+)([^>]*?)(/?)>', xml):
    close,tag,attrs,selfc=m.groups()
    if close:
        depth-=1
        if depth==2 and cur: comps.append(cur); cur=None
        continue
    if depth==1: sec=A(attrs,'name')
    elif depth==2: cur={'sec':sec,'id':A(attrs,'id'),'x':F(A(attrs,'x')),'y':F(A(attrs,'y')),
                        'w':F(A(attrs,'width')),'h':F(A(attrs,'height')),'kids':[]}
    elif cur is not None and depth==3:
        cur['kids'].append({'tag':tag,'name':A(attrs,'name'),'x':F(A(attrs,'x')),
                            'y':F(A(attrs,'y')),'w':F(A(attrs,'width')),'h':F(A(attrs,'height'))})
    if not selfc: depth+=1

imgs={'Mobile App':(Image.open(f'{S}/sec-mobile.png').convert('L'),13904,13860),
      'Web':(Image.open(f'{S}/sec-web.png').convert('L'),11527,13860)}
res=[]
for c in comps:
    scr=[k for k in c['kids'] if k['tag']=='frame' and k['w'] and k['name']!='Group']
    if not scr: continue
    im,W,H=imgs[c['sec']]; sx=im.width/W; sy=im.height/H
    crop=im.crop((int(c['x']*sx),int(c['y']*sy),int((c['x']+c['w'])*sx),int((c['y']+c['h'])*sy)))
    w,h=crop.size
    if w<40: continue
    hist=crop.histogram(); bg=max(range(256),key=lambda i:hist[i])
    thr=min(252,(bg+255)//2+4)
    px=crop.load()

    lefts=[]
    for y in range(h):
        xs=[x for x in range(w) if px[x,y]>thr]
        lefts.append(xs[0] if xs else None)
    pairs=[(a,b) for a,b in zip(lefts,lefts[1:]) if a is not None and b is not None]
    edge=(sum(1 for a,b in pairs if abs(a-b)<=1)/len(pairs)) if pairs else 0

    truth=crop.point(lambda v:1 if v>thr else 0)
    mine=Image.new('L',(w,h),0); d=ImageDraw.Draw(mine)
    for k in scr:
        r=max(2,int(k['w']*sx*0.12))
        d.rounded_rectangle([k['x']*sx,k['y']*sy,(k['x']+k['w'])*sx,(k['y']+k['h'])*sy],r,fill=1)
    ta,tb=list(truth.getdata()),list(mine.getdata())
    inter=sum(1 for p,q in zip(ta,tb) if p and q); union=sum(1 for p,q in zip(ta,tb) if p or q)
    res.append({'sec':c['sec'],'id':c['id'],'n':len(scr),
                'edge':round(edge,3),'iou':round(inter/union if union else 0,3)})

json.dump(res,open('/tmp/scores.json','w'))
known={'1509:513':'flat','1509:667':'flat','1509:1043':'ROTATED'}
for r in res:
    if r['id'] in known: print(f"  {r['id']:11} edge={r['edge']:.3f} iou={r['iou']:.3f}  {known[r['id']]}")
ok=[r for r in res if r['edge']>=0.75 and r['iou']>=0.75]
print(f"\n{len(res)} scored -> {len(ok)} pass (edge>=.75 and iou>=.75)")
from collections import Counter
print(Counter(r['sec'] for r in ok))
