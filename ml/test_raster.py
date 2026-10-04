"""Golden parity: Python rasterize_strokes must match the grids shipped from TypeScript."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from raster28 import rasterize_strokes  # noqa: E402

golden = json.loads((ROOT / "golden_rasters.json").read_text())
failed = 0
for index, item in enumerate(golden):
    strokes = [[(point[0], point[1]) for point in stroke] for stroke in item["strokes"]]
    got = [float(value) for value in rasterize_strokes(strokes)]
    expected = [float(value) for value in item["grid"]]
    if len(got) != len(expected):
        failed += 1
        print(f"length mismatch on golden sample {index}")
        continue
    max_diff = max(abs(a - b) for a, b in zip(got, expected))
    if max_diff > 1e-3:
        failed += 1
        print(f"mismatch on golden sample {index} max_diff={max_diff}")
if failed:
    sys.exit(1)
print(f"Python rasterizer matched {len(golden)} golden grids within 1e-3.")

# Optional CNN forward golden (written by train_digit_cnn.py).
cnn_gold = ROOT / "golden_cnn_forward.json"
weights = ROOT.parent / "src" / "lib" / "cognition" / "models" / "digit_mlp.json"
if cnn_gold.exists() and weights.exists():
    from train_digit_cnn import cnn_numpy_forward  # noqa: E402
    import numpy as np

    payload = json.loads(weights.read_text())
    if payload.get("kind") == "cnn":
        data = json.loads(cnn_gold.read_text())
        probs = cnn_numpy_forward(payload, np.array(data["inputs"], dtype=np.float64))
        expected = np.array(data["probs"], dtype=np.float64)
        max_diff = float(np.max(np.abs(probs - expected)))
        if max_diff > 1e-4:
            print(f"CNN forward golden mismatch max_diff={max_diff}")
            sys.exit(1)
        print(f"CNN forward golden matched within 1e-4 (max_diff={max_diff:.2e}).")
