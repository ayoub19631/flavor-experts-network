# One-off asset optimization for the frontend public folder.
from PIL import Image
import os

base = os.path.join(os.path.dirname(__file__), "..", "app", "frontend", "public")
base = os.path.abspath(base)
brand = os.path.join(base, "brand")


def kb(p):
    return os.path.getsize(p) // 1024


jobs = [
    ("hero-flavor-lab.png", "hero-flavor-lab.webp", 1920, 82),
    ("section-community.jpg", "section-community.webp", 1920, 80),
    ("section-market.jpg", "section-market.webp", 1920, 80),
    ("flavor-expertise-science.png", "flavor-expertise-science.webp", 1600, 82),
]
for src_name, dest_name, max_w, q in jobs:
    src = os.path.join(brand, src_name)
    dest = os.path.join(brand, dest_name)
    im = Image.open(src).convert("RGB")
    if im.width > max_w:
        im = im.resize((max_w, int(im.height * max_w / im.width)), Image.LANCZOS)
    im.save(dest, "WEBP", quality=q, method=6)
    print(f"{src_name} {kb(src)}KB -> {dest_name} {kb(dest)}KB ({im.width}x{im.height})")

favicon = os.path.join(base, "favicon.png")
im = Image.open(favicon)
im.thumbnail((64, 64), Image.LANCZOS)
im.save(favicon, "PNG", optimize=True)
print("favicon.png ->", kb(favicon), "KB", im.size)

touch = os.path.join(brand, "apple-touch-icon.png")
im = Image.open(touch)
im.thumbnail((180, 180), Image.LANCZOS)
im.save(touch, "PNG", optimize=True)
print("apple-touch-icon.png ->", kb(touch), "KB", im.size)

og_src = os.path.join(brand, "logo-og.png")
im = Image.open(og_src).convert("RGB")
W, H = 1200, 630
ar_t = W / H
ar_i = im.width / im.height
if ar_i > ar_t:
    nw = int(im.height * ar_t)
    x = (im.width - nw) // 2
    im = im.crop((x, 0, x + nw, im.height))
else:
    nh = int(im.width / ar_t)
    y = (im.height - nh) // 2
    im = im.crop((0, y, im.width, y + nh))
im = im.resize((W, H), Image.LANCZOS)
og_dest = os.path.join(brand, "logo-og.jpg")
im.save(og_dest, "JPEG", quality=85, optimize=True, progressive=True)
print("logo-og.jpg ->", kb(og_dest), "KB", im.size)
