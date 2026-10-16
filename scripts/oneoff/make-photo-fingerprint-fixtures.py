# Fixtures for probe-photo-fingerprint-browser.mjs: four synthetic mountain scenes (sky gradient,
# ridges, rock/snow texture), each with the copies a borrowed photo arrives as -- a q50 re-save, a
# 400px and a 600px resize, a lossless PNG -- plus six different scenes. Needs Pillow.
#   python3 scripts/oneoff/make-photo-fingerprint-fixtures.py <out_dir>
import io, os, random, sys
from PIL import Image, ImageDraw, ImageFilter

def scene(seed, w=800, h=600):
    rnd = random.Random(seed)
    im = Image.new('RGB', (w, h)); d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / h; d.line([(0, y), (w, y)], fill=(int(110 + 110 * t), int(168 + 70 * t), int(216 + 30 * t)))
    for _ in range(7):
        bx = rnd.random() * w; top = h * (0.2 + rnd.random() * 0.5)
        c = (60 + int(rnd.random() * 80), 60 + int(rnd.random() * 60), 70 + int(rnd.random() * 60))
        d.polygon([(bx - w * 0.4, h), (bx, top), (bx + w * 0.4, h)], fill=c)
    for _ in range(1500):
        x, y = rnd.random() * w, h * 0.3 + rnd.random() * h * 0.7
        v = int(rnd.random() * 60) - 30
        d.point((x, y), fill=(128 + v, 128 + v, 128 + v))
    return im.filter(ImageFilter.GaussianBlur(1))

D = sys.argv[1]
os.makedirs(D, exist_ok=True)
for s in range(4):
    o = scene(s)
    o.save(os.path.join(D, f's{s}_orig.jpg'), quality=92)
    o.save(os.path.join(D, f's{s}_q50.jpg'), quality=50)
    o.resize((400, 300), Image.LANCZOS).save(os.path.join(D, f's{s}_400.jpg'), quality=70)
    o.resize((600, 450), Image.LANCZOS).save(os.path.join(D, f's{s}_600q60.jpg'), quality=60)
    o.save(os.path.join(D, f's{s}_lossless.png'))
for t in range(40, 46):
    scene(t).save(os.path.join(D, f'other{t}.jpg'), quality=90)
print(len(os.listdir(D)), 'fixtures in', D)
