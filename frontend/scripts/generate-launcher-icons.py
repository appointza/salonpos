from PIL import Image
from pathlib import Path

android_res = Path(r"D:\aravindan\project\freelancer\salonpos\frontend\android\app\src\main\res")
logo = Image.open(Path(r"D:\aravindan\project\freelancer\salonpos\frontend\resources\icon.png")).convert("RGBA")

splash_sizes = {
    "drawable/splash.png": (480, 320),
    "drawable-land-mdpi/splash.png": (480, 320),
    "drawable-land-hdpi/splash.png": (800, 480),
    "drawable-land-xhdpi/splash.png": (1280, 720),
    "drawable-land-xxhdpi/splash.png": (1600, 960),
    "drawable-land-xxxhdpi/splash.png": (1920, 1280),
    "drawable-port-mdpi/splash.png": (320, 480),
    "drawable-port-hdpi/splash.png": (480, 800),
    "drawable-port-xhdpi/splash.png": (720, 1280),
    "drawable-port-xxhdpi/splash.png": (960, 1600),
    "drawable-port-xxxhdpi/splash.png": (1280, 1920),
}


def splash(size):
    canvas = Image.new("RGBA", size, (255, 255, 255, 255))
    max_side = int(min(size) * 0.42)
    scale = max_side / max(logo.size)
    nw, nh = max(1, int(logo.size[0] * scale)), max(1, int(logo.size[1] * scale))
    resized = logo.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas.paste(resized, ((size[0] - nw) // 2, (size[1] - nh) // 2), resized)
    return canvas.convert("RGB")


for rel, size in splash_sizes.items():
    path = android_res / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    splash(size).save(path, "PNG")
    print(rel, size)
