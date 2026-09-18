#!/usr/bin/env python3
"""
Генерирует иконки приложения из палитры src/../assets/colors.

Запуск:  pip install Pillow && python3 scripts/generate-icons.py

Кладёт:
  assets/icon.png                      — 1024, full-bleed (iOS / Expo / EAS)
  assets/adaptive-icon.png             — 1024, только глиф на прозрачном (Android adaptive)
  android/.../mipmap-*/ic_launcher.png         — legacy, скруглённый квадрат
  android/.../mipmap-*/ic_launcher_round.png   — legacy, круг
  android/.../mipmap-*/ic_launcher_foreground.png — слой для adaptive icon
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "assets/fonts/MartianMono-Bold.ttf"   # тот же тикерный шрифт, что в UI

# Палитра из assets/colors/colors.ts
AMBER_LIGHT = (247, 184, 92)
AMBER_DARK  = (219, 138, 40)
INK         = (36, 24, 4)      # accentInk

SS = 4  # суперсэмплинг

def gradient(size, top, bottom):
    """Диагональный тёплый градиент — чтобы плашка не выглядела плоской заливкой."""
    g = Image.new("RGB", (size, size))
    px = g.load()
    for y in range(size):
        for x in range(size):
            t = (x / size * 0.35) + (y / size * 0.65)
            px[x, y] = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
    return g

def sparkline(draw, size, color, width_ratio, points):
    """Восходящая линия котировки: та же метафора, что на карточке в приложении."""
    w = max(2, round(size * width_ratio))
    pts = [(x * size, y * size) for x, y in points]
    draw.line(pts, fill=color, width=w, joint="curve")
    for cx, cy in (pts[0], pts[-1]):           # круглые торцы
        draw.ellipse([cx - w / 2, cy - w / 2, cx + w / 2, cy + w / 2], fill=color)


# Композиция в долях холста. Глиф сверху, линия отдельным блоком снизу —
# так линия не читается как перечёркивание.
GLYPH_SIZE = 0.46
GLYPH_Y    = 0.40
SPARK      = [(0.16, 0.84), (0.34, 0.78), (0.48, 0.81), (0.66, 0.70), (0.84, 0.62)]
SPARK_W    = 0.050
DOT_R      = 0.052


def compose(img, size, color, scale=1.0):
    """Рисует глиф и линию. scale < 1 поджимает всё к центру (безопасная зона adaptive icon)."""
    def sy(v):  # сжатие координаты к центру холста
        return 0.5 + (v - 0.5) * scale

    d = ImageDraw.Draw(img)

    font = ImageFont.truetype(str(FONT), round(size * GLYPH_SIZE * scale))
    box = d.textbbox((0, 0), "$", font=font)
    d.text(
        ((size - (box[2] - box[0])) / 2 - box[0],
         size * sy(GLYPH_Y) - (box[3] - box[1]) / 2 - box[1]),
        "$", font=font, fill=color + (255,),
    )

    pts = [(sy(x), sy(y)) for x, y in SPARK]
    sparkline(d, size, color + (255,), SPARK_W * scale, pts)

    # Акцентная точка на последнем значении — как на спарклайне в HomeScreen
    cx, cy = pts[-1][0] * size, pts[-1][1] * size
    r = size * DOT_R * scale
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (255,))


def full_bleed(size, content_scale=1.0):
    """Квадратная плашка с фоном — для iOS/Expo и как основа для legacy-мипмапов.

    content_scale < 1 нужен круглому варианту: композиция вписана в квадрат,
    и при обрезке кругом её углы (левый конец линии) иначе срезаются.
    """
    s = size * SS
    img = gradient(s, AMBER_LIGHT, AMBER_DARK).convert("RGBA")
    compose(img, s, INK, scale=content_scale)
    return img.resize((size, size), Image.LANCZOS)


def foreground(size):
    """Слой adaptive icon: контент держим внутри безопасной зоны (центральные 66%)."""
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    compose(img, s, INK, scale=0.66)
    return img.resize((size, size), Image.LANCZOS)


def rounded(img, radius_ratio):
    s = img.size[0] * SS
    big = img.resize((s, s), Image.LANCZOS)
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1],
                                           radius=round(s * radius_ratio), fill=255)
    out = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    out.paste(big, (0, 0), mask)
    return out.resize(img.size, Image.LANCZOS)


def circle(img):
    return rounded(img, 0.5)


DPI = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
RES = ROOT / "android/app/src/main/res"
IOS_ICONSET = ROOT / "ios/DolarBlue/Images.xcassets/AppIcon.appiconset"

ROUND_SCALE = 0.90   # см. docstring full_bleed


def write_android():
    for name, mult in DPI.items():
        out = RES / f"mipmap-{name}"
        out.mkdir(parents=True, exist_ok=True)
        launcher = round(48 * mult)   # legacy launcher icon
        fg = round(108 * mult)        # adaptive icon: холст 108dp
        rounded(full_bleed(launcher), 0.22).save(out / "ic_launcher.png")
        circle(full_bleed(launcher, ROUND_SCALE)).save(out / "ic_launcher_round.png")
        foreground(fg).save(out / "ic_launcher_foreground.png")
        print(f"  mipmap-{name}: launcher {launcher}px, foreground {fg}px")


def write_ios():
    """Заполняет пустые слоты AppIcon.appiconset и проставляет filename в Contents.json."""
    import json

    meta = json.loads((IOS_ICONSET / "Contents.json").read_text())
    for entry in meta["images"]:
        pt = float(entry["size"].split("x")[0])
        px = round(pt * float(entry["scale"].rstrip("x")))
        fname = f"icon-{px}.png"
        # iOS сам скругляет углы и не принимает альфа-канал
        full_bleed(px).convert("RGB").save(IOS_ICONSET / fname)
        entry["filename"] = fname
    (IOS_ICONSET / "Contents.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"  {len(meta['images'])} иконок в AppIcon.appiconset")


def main():
    (ROOT / "assets").mkdir(exist_ok=True)

    full_bleed(1024).convert("RGB").save(ROOT / "assets/icon.png")
    foreground(1024).save(ROOT / "assets/adaptive-icon.png")
    print("assets/: icon.png, adaptive-icon.png")

    print("android/")
    write_android()

    print("ios/")
    write_ios()


if __name__ == "__main__":
    main()
