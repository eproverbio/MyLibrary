from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]

copies = [
    (
        ROOT / "assets_pipeline" / "outputs" / "png" / "coin_icon.png",
        ROOT / "android" / "app" / "src" / "main" / "res" / "drawable" / "coin_icon.png",
    ),
    (
        ROOT / "assets_pipeline" / "outputs" / "glb" / "coin.glb",
        ROOT / "android" / "app" / "src" / "main" / "assets" / "models" / "coin.glb",
    ),
]


for src, dst in copies:
    if not src.exists():
        raise FileNotFoundError(f"Missing source asset: {src}")

    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    print(f"Copied {src} -> {dst}")
