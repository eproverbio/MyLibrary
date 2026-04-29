from __future__ import annotations

import json
import sys

from engine.mock_engine import run
from schemas import CapturedImage


def main() -> int:
    payload = json.load(sys.stdin)
    image = CapturedImage(
        uri=payload["image"]["uri"],
        width=payload["image"]["width"],
        height=payload["image"]["height"],
        format=payload["image"]["format"],
        captured_at=payload["image"]["capturedAt"],
    )
    response = run(image)
    json.dump(response.to_dict(), sys.stdout, ensure_ascii=True, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
