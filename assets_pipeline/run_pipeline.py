import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

BLENDER_EXE_CANDIDATES = [
    Path(r"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe"),
    Path(r"C:\Program Files\Blender Foundation\Blender 4.3\blender.exe"),
    Path(r"C:\Program Files\Blender Foundation\Blender 4.2\blender.exe"),
    Path(r"C:\Program Files\Blender Foundation\Blender 4.1\blender.exe"),
    Path(r"C:\Program Files\Blender Foundation\Blender 4.0\blender.exe"),
]

BLENDER_SCRIPT = ROOT / "assets_pipeline" / "blender" / "generate_coin_icon.py"
COPY_SCRIPT = ROOT / "assets_pipeline" / "copy_assets.py"


def find_blender():
    for candidate in BLENDER_EXE_CANDIDATES:
        if candidate.exists():
            return str(candidate)

    blender_on_path = shutil.which("blender")
    if blender_on_path:
        return blender_on_path

    raise FileNotFoundError(
        "Blender executable not found. Update BLENDER_EXE_CANDIDATES or install Blender on PATH."
    )


def find_python():
    current = Path(sys.executable)
    if current.exists():
        return str(current)

    for command in ("python", "py"):
        resolved = shutil.which(command)
        if resolved:
            return resolved

    raise FileNotFoundError("Python executable not found.")


def run(cmd):
    print("Running:", " ".join(map(str, cmd)))
    subprocess.run(cmd, check=True, cwd=ROOT)


def main():
    blender = find_blender()
    python_exe = find_python()

    run(
        [
            blender,
            "--background",
            "--python",
            str(BLENDER_SCRIPT),
        ]
    )

    run([python_exe, str(COPY_SCRIPT)])


if __name__ == "__main__":
    main()
