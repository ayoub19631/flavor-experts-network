#!/usr/bin/env python3
"""Generate app icons & splash screens for Capacitor (Android/iOS) and Electron
from the brand flask mark.

Outputs:
  app/frontend/assets/icon-only.png        1024x1024  (Capacitor master icon)
  app/frontend/assets/icon-foreground.png  1024x1024  (Android adaptive fg, transparent)
  app/frontend/assets/icon-background.png  1024x1024  (Android adaptive bg)
  app/frontend/assets/splash.png           2732x2732  (light/brand splash)
  app/frontend/assets/splash-dark.png      2732x2732  (dark splash)
  electron/assets/icon.png                 512x512
  electron/assets/icon.ico                 multi-size Windows icon
  electron/assets/tray-icon.ico            32px tray icon
  electron/assets/icon.icns-src.png        1024x1024 (convert to .icns on macOS)
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "app" / "frontend" / "public" / "brand" / "flavor-expertise-science.webp"
CAP_ASSETS = ROOT / "app" / "frontend" / "assets"
EL_ASSETS = ROOT / "electron" / "assets"

BRAND_BG = (0, 45, 84)  # #002D54


def load_mark() -> Image.Image:
    img = Image.open(BRAND).convert("RGBA")
    # Trim transparent padding for tighter composition
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def paste_centered(bg: Image.Image, mark: Image.Image, scale: float) -> Image.Image:
    side = bg.size[0]
    target = int(side * scale)
    ratio = target / max(mark.size)
    resized = mark.resize(
        (max(1, int(mark.size[0] * ratio)), max(1, int(mark.size[1] * ratio))),
        Image.LANCZOS,
    )
    x = (side - resized.size[0]) // 2
    y = (side - resized.size[1]) // 2
    bg.paste(resized, (x, y), resized)
    return bg


def main() -> None:
    mark = load_mark()
    CAP_ASSETS.mkdir(parents=True, exist_ok=True)
    EL_ASSETS.mkdir(parents=True, exist_ok=True)

    # Capacitor master icon (solid brand bg)
    icon = Image.new("RGBA", (1024, 1024), BRAND_BG + (255,))
    paste_centered(icon, mark, 0.62)
    icon.save(CAP_ASSETS / "icon-only.png")

    # Android adaptive: foreground = mark on transparency, background = solid brand
    fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    paste_centered(fg, mark, 0.55)
    fg.save(CAP_ASSETS / "icon-foreground.png")
    Image.new("RGBA", (1024, 1024), BRAND_BG + (255,)).save(CAP_ASSETS / "icon-background.png")

    # Splashes
    for name in ("splash.png", "splash-dark.png"):
        splash = Image.new("RGBA", (2732, 2732), BRAND_BG + (255,))
        paste_centered(splash, mark, 0.28)
        splash.save(CAP_ASSETS / name)

    # Electron icons
    el_icon = Image.new("RGBA", (512, 512), BRAND_BG + (255,))
    paste_centered(el_icon, mark, 0.62)
    el_icon.save(EL_ASSETS / "icon.png")
    el_icon.save(EL_ASSETS / "icon.icns-src.png")  # png2icns on macOS when needed

    ico = Image.new("RGBA", (256, 256), BRAND_BG + (255,))
    paste_centered(ico, mark, 0.62)
    ico.save(
        EL_ASSETS / "icon.ico",
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    tray = Image.new("RGBA", (32, 32), BRAND_BG + (255,))
    paste_centered(tray, mark, 0.7)
    tray.save(EL_ASSETS / "tray-icon.ico", format="ICO", sizes=[(16, 16), (32, 32)])

    print("icons written:")
    for p in sorted(CAP_ASSETS.glob("*.png")) + sorted(EL_ASSETS.glob("*")):
        print(" -", p.relative_to(ROOT), p.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
