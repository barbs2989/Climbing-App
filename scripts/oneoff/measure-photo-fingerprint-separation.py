# Why 0208's photo bar is 8 bits of 64. Runs lib/photoEvidence.js's difference hash (here at 8x8 and
# 16x16) over synthetic mountain scenes: each against its own re-saves/resizes/PNG, against other
# scenes, and against the same view shifted 3% sideways. Measured 2026-09-24:
#   64-bit : copies max 12.5% (8 bits) | different scenes min 18.8% (12) | same view 3% shifted 4.7-7.8%
#   256-bit: copies max 11.7%          | different scenes min 12.5%      | same view 6.2-10.2%
# CAUTION (2026-09-25): these are PILLOW's numbers, and Pillow averages areas when it shrinks. The app
# hashes in the BROWSER, which sampled instead, and there copies drifted 14 bits. The browser
# function now area-averages with a dead band; probe-photo-fingerprint-browser.mjs measures THAT.
# so the bigger hash separates no better, 8 catches every copy, and a shot of one view from a step
# aside cannot be told from a copy by any threshold. Needs Pillow.  python3 <this file>
# The same difference hash lib/photoEvidence.js computes (9x8 greyscale, left > right = 1), run on
# photographic-ish scenes, to measure whether a 3-bit bar separates "the same picture re-saved" from
# "a different picture of a similar scene".
from PIL import Image, ImageDraw, ImageFilter
import io, random

def dhash(im):
    g = im.convert('RGB').resize((9, 8), Image.BILINEAR)
    px = g.load(); h = 0
    lum = lambda x, y: px[x, y][0] * 0.299 + px[x, y][1] * 0.587 + px[x, y][2] * 0.114
    for y in range(8):
        for x in range(8):
            h = (h << 1) | (1 if lum(x, y) > lum(x + 1, y) else 0)
    return h

def scene(seed, w=800, h=600, shift=0):
    rnd = random.Random(seed)
    im = Image.new('RGB', (w, h)); d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / h; d.line([(0, y), (w, y)], fill=(int(110 + 110 * t), int(168 + 70 * t), int(216 + 30 * t)))
    for _ in range(7):
        bx = rnd.random() * w + shift; top = h * (0.2 + rnd.random() * 0.5)
        c = (60 + int(rnd.random() * 80), 60 + int(rnd.random() * 60), 70 + int(rnd.random() * 60))
        d.polygon([(bx - w * 0.4, h), (bx, top), (bx + w * 0.4, h)], fill=c)
    # texture, like rock and snow
    for _ in range(1500):
        x, y = rnd.random() * w, h * 0.3 + rnd.random() * h * 0.7
        v = int(rnd.random() * 60) - 30
        d.point((x, y), fill=(128 + v, 128 + v, 128 + v))
    return im.filter(ImageFilter.GaussianBlur(1))

def resave(im, q, size=None, fmt='JPEG'):
    if size: im = im.resize(size, Image.LANCZOS)
    b = io.BytesIO(); im.save(b, fmt, quality=q) if fmt != 'PNG' else im.save(b, fmt)
    return Image.open(io.BytesIO(b.getvalue()))

from PIL import Image
def dh(im, W, H, eps=0.0):
    g = im.convert('RGB').resize((W + 1, H), Image.BILINEAR); px = g.load(); h = 0
    lum = lambda x, y: px[x, y][0] * 0.299 + px[x, y][1] * 0.587 + px[x, y][2] * 0.114
    for y in range(H):
        for x in range(W):
            h = (h << 1) | (1 if lum(x, y) > lum(x + 1, y) + eps else 0)
    return h
bits = lambda a, b: bin(a ^ b).count('1')
for (W, H) in ((8, 8), (16, 16)):
    n = W * H; copy = []; other = []; view = []
    for s in range(12):
        o = scene(s); ho = dh(resave(o, 92), W, H)
        for v in (resave(o, 50), resave(o, 70, (400, 300)), resave(o, 85, (200, 150)), resave(o, 60, (600, 450)), resave(o, 0, None, 'PNG')):
            copy.append(bits(ho, dh(v, W, H)))
        for t in range(40, 52): other.append(bits(ho, dh(resave(scene(t), 90), W, H)))
        view.append(bits(ho, dh(resave(scene(s, shift=24), 90), W, H)))
    pct = lambda x: round(100 * x / n, 1)
    print(f'{n}-bit: copies max {pct(max(copy))}%  |  different scenes min {pct(min(other))}%  |  same view 3% shifted min {pct(min(view))}% median {pct(sorted(view)[6])}%')
