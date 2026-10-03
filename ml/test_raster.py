"""Golden parity: Python rasterize_strokes must match the grids shipped from TypeScript."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from train_cognition import rasterize_strokes  # noqa: E402

golden = json.loads((ROOT / "golden_rasters.json").read_text())
failed = 0
for index, item in enumerate(golden):
    strokes = [[(point[0], point[1]) for point in stroke] for stroke in item["strokes"]]
    got = [round(float(value), 5) for value in rasterize_strokes(strokes)]
    expected = [round(float(value), 5) for value in item["grid"]]
    if got != expected:
        failed += 1
        print(f"mismatch on golden sample {index}")
if failed:
    sys.exit(1)
print(f"Python rasterizer matched {len(golden)} golden grids.")
