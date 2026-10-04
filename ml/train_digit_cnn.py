"""Train on-device digit CNN (PyTorch) + comparison MLP; export JSON for the app."""
from __future__ import annotations

import hashlib
import json
import math
import os
import platform
import random
import time
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ["CUBLAS_WORKSPACE_CONFIG"] = ":4096:8"

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier

from raster28 import GRID, rasterize_strokes

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "lib" / "cognition" / "models"
ML = ROOT / "ml"
SEED = 42

# Stroke templates (0–80 box) — same shapes as train_cognition.py
def poly(points):
    return [tuple(p) for p in points]


WESTERN = {
    0: [poly([(24, 16), (56, 16), (64, 40), (56, 64), (24, 64), (16, 40), (24, 16)])],
    1: [poly([(40, 12), (40, 68)]), poly([(28, 24), (40, 12)])],
    2: [poly([(18, 22), (58, 16), (62, 36), (20, 64), (64, 66)])],
    3: [poly([(18, 16), (58, 16), (58, 36), (30, 40), (60, 48), (58, 66), (18, 66)])],
    4: [poly([(18, 12), (18, 40), (64, 40)]), poly([(50, 12), (50, 70)])],
    5: [poly([(62, 14), (18, 16), (18, 36), (56, 36), (60, 66), (18, 66)])],
    6: [poly([(58, 16), (22, 28), (18, 64), (56, 66), (60, 44), (20, 40)])],
    7: [poly([(16, 14), (64, 14), (36, 70)]), poly([(16, 14), (40, 14)])],
    8: [poly([(40, 12), (62, 24), (40, 40), (18, 56), (40, 68), (62, 56), (40, 40), (18, 24), (40, 12)])],
    9: [poly([(56, 40), (20, 40), (18, 16), (56, 14), (60, 68)])],
}
ARABIC = {
    0: [poly([(40, 18), (58, 40), (40, 62), (22, 40), (40, 18)])],
    1: [poly([(40, 14), (40, 66)])],
    2: [poly([(58, 20), (24, 28), (20, 48), (48, 58)])],
    3: [poly([(56, 16), (24, 24), (50, 40), (22, 56), (54, 66)])],
    4: [poly([(54, 18), (22, 30), (48, 42), (24, 64)])],
    5: [poly([(40, 20), (58, 36), (40, 52), (22, 36), (40, 20), (40, 68)])],
    6: [poly([(18, 18), (58, 22), (40, 66)])],
    7: [poly([(20, 18), (40, 66), (60, 18)])],
    8: [poly([(22, 58), (40, 16), (58, 58)])],
    9: [poly([(22, 20), (50, 16), (58, 40), (40, 68)])],
}
DEVANAGARI = {
    0: [poly([(40, 16), (60, 40), (40, 64), (20, 40), (40, 16)])],
    1: [poly([(28, 20), (40, 12), (36, 68)])],
    2: [poly([(20, 24), (56, 16), (58, 36), (22, 66)])],
    3: [poly([(20, 16), (56, 18), (34, 40), (58, 44), (54, 66), (20, 64)])],
    4: [poly([(22, 16), (22, 48), (58, 40), (40, 18), (40, 68)])],
    5: [poly([(48, 14), (22, 28), (28, 48), (56, 44), (36, 68)])],
    6: [poly([(52, 16), (24, 24), (20, 50), (48, 58), (36, 68)])],
    7: [poly([(24, 18), (36, 16), (58, 36), (30, 66)])],
    8: [poly([(18, 24), (40, 16), (62, 28), (18, 48), (40, 66), (62, 50)])],
    9: [poly([(24, 20), (52, 14), (58, 36), (30, 40), (54, 68)])],
}
SCRIPTS = {"western": WESTERN, "arabic": ARABIC, "devanagari": DEVANAGARI}


def _smooth(pts):
    if len(pts) < 3:
        return pts
    out = [pts[0]]
    for i in range(1, len(pts) - 1):
        out.append(
            (
                pts[i][0] * 0.5 + pts[i - 1][0] * 0.25 + pts[i + 1][0] * 0.25,
                pts[i][1] * 0.5 + pts[i - 1][1] * 0.25 + pts[i + 1][1] * 0.25,
            )
        )
    out.append(pts[-1])
    return out


def transform_strokes(strokes, rng: random.Random, hard: bool):
    """Child-style finger variation. Hard keeps rotation≤20°, slant, scale, wobble,
    multi-stroke retrace, and modest gaps — not so destructive that classes collide."""
    jitter = 3.4 if hard else 1.5
    rot = math.radians(rng.uniform(-20, 20) if hard else rng.uniform(-9, 9))
    shear = rng.uniform(-0.22, 0.22) if hard else rng.uniform(-0.1, 0.1)
    sx = rng.uniform(0.7, 1.3) if hard else rng.uniform(0.82, 1.18)
    sy = rng.uniform(0.7, 1.32) if hard else rng.uniform(0.82, 1.22)
    ox = rng.uniform(-6, 28)
    oy = rng.uniform(-6, 28)
    cos_r, sin_r = math.cos(rot), math.sin(rot)
    out = []
    for stroke in strokes:
        pts = []
        for x, y in stroke:
            x = (x - 40) * sx
            y = (y - 40) * sy
            x = x + shear * y
            rx = x * cos_r - y * sin_r
            ry = x * sin_r + y * cos_r
            rx += 40 + ox + rng.uniform(-jitter, jitter)
            ry += 40 + oy + rng.uniform(-jitter, jitter)
            pts.append((rx, ry))
        if len(pts) > 3 and rng.random() < (0.85 if hard else 0.55):
            pts = _smooth(pts)
        if len(pts) > 2 and rng.random() < (0.35 if hard else 0.18):
            x0, y0 = pts[-2]
            x1, y1 = pts[-1]
            reach = rng.uniform(0.1, 0.32)
            pts.append((x1 + (x1 - x0) * reach, y1 + (y1 - y0) * reach))
        if len(pts) > 5 and rng.random() < (0.18 if hard else 0.12):
            pts = pts[:-1]
        if len(pts) > 5 and rng.random() < (0.18 if hard else 0.15):
            gap = len(pts) // 2
            pts = pts[: gap - 1] + pts[gap + 1 :]
        if len(pts) > 4 and rng.random() < (0.3 if hard else 0.08):
            pts = pts + list(reversed(pts[:3]))
        step = 2 if hard and rng.random() < 0.25 else 1
        pts = pts[::step] if len(pts) > 2 else pts
        out.append(pts)
        # Multi-stroke retrace for 4/5/7-style noise.
        if rng.random() < (0.5 if hard else 0.2):
            dx = rng.uniform(-2.0, 2.0)
            dy = rng.uniform(-2.0, 2.0)
            out.append([(px + dx, py + dy) for px, py in pts])
    return out


def densify_stroke(stroke, step=3.0):
    if len(stroke) < 2:
        return stroke
    out = [stroke[0]]
    for i in range(1, len(stroke)):
        x0, y0 = stroke[i - 1]
        x1, y1 = stroke[i]
        dist = math.hypot(x1 - x0, y1 - y0)
        pieces = max(1, int(round(dist / step)))
        for p in range(1, pieces + 1):
            t = p / pieces
            out.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
    return out


def render_example(digit, script, rng, hard=False, reverse=False):
    strokes = [list(s) for s in SCRIPTS[script][digit]]
    if reverse and script == "western":
        strokes = [[(x, 80 - y) for x, y in s] for s in strokes]
    strokes = transform_strokes(strokes, rng, hard)
    strokes = [densify_stroke(s) for s in strokes]
    return np.array(rasterize_strokes(strokes), dtype=np.float64)


def stack_synthetic(count, rng, hard=False, scripts=None, mix_hard=0):
    scripts = scripts or list(SCRIPTS)
    xs, ys, ss = [], [], []
    for script in scripts:
        for digit in range(10):
            copies = count + (count // 4 if digit in (2, 5, 6, 7, 9) and script == "western" else 0)
            for n in range(copies):
                reverse = script == "western" and digit in (2, 5, 6, 9) and n >= count
                xs.append(render_example(digit, script, rng, hard=hard, reverse=reverse))
                ys.append(digit)
                ss.append(script)
            for _ in range(mix_hard):
                xs.append(render_example(digit, script, rng, hard=True))
                ys.append(digit)
                ss.append(script)
    return np.array(xs), np.array(ys), ss


def load_mnist_torch(train=True):
    note = ""
    try:
        from torchvision import datasets, transforms

        cache = ML / "data" / "cache"
        cache.mkdir(parents=True, exist_ok=True)
        ds = datasets.MNIST(root=str(cache), train=train, download=True, transform=transforms.ToTensor())
        xs, ys = [], []
        for img, label in ds:
            arr = img.numpy().reshape(-1).astype(np.float64)
            xs.append(arr)
            ys.append(int(label))
        note = "torchvision MNIST (Yann LeCun et al., CC BY-SA 3.0)"
        return np.array(xs), np.array(ys), note
    except Exception as exc:  # noqa: BLE001
        note = f"torchvision failed ({exc}); "
    try:
        from sklearn.datasets import fetch_openml

        data = fetch_openml("mnist_784", version=1, as_frame=False, parser="auto")
        x = (data.data.astype(np.float64) / 255.0)
        y = data.target.astype(int)
        if train:
            return x[:60000], y[:60000], note + "sklearn fetch_openml mnist_784"
        return x[60000:], y[60000:], note + "sklearn fetch_openml mnist_784"
    except Exception as exc:  # noqa: BLE001
        note += f"openml failed ({exc}); "
    from sklearn.datasets import load_digits

    digits = load_digits()
    # Upscale 8x8 to 28x28 nearest-neighbor for a weak fallback.
    xs = []
    for image in digits.images:
        big = np.kron(image / 16.0, np.ones((3, 3)))
        canvas = np.zeros((28, 28))
        canvas[2:26, 2:26] = big[:24, :24]
        xs.append(canvas.reshape(-1))
    note += "sklearn load_digits 8x8 upscaled (no network)"
    x = np.array(xs)
    y = digits.target.astype(int)
    if train:
        return x[:1400], y[:1400], note
    return x[1400:], y[1400:], note


def load_real_strokes(repeat=4):
    folder = ML / "data" / "real"
    rows = []
    if not folder.exists():
        return rows
    for path in sorted(folder.glob("*.json")):
        try:
            data = json.loads(path.read_text())
        except json.JSONDecodeError:
            continue
        items = data.get("samples", []) if isinstance(data, dict) else data
        if not isinstance(items, list):
            continue
        for item in items:
            if not isinstance(item, dict):
                continue
            strokes = item.get("strokes")
            digit = item.get("digit", item.get("label"))
            script = item.get("script", "western")
            if not isinstance(strokes, list) or not isinstance(digit, int):
                continue
            if digit < 0 or digit > 9 or script not in SCRIPTS:
                continue
            pts = []
            for stroke in strokes:
                pts.append([(float(p["x"]), float(p["y"])) if isinstance(p, dict) else (float(p[0]), float(p[1])) for p in stroke])
            rows.append((np.array(rasterize_strokes(pts), dtype=np.float64), digit, script))
    return rows * repeat


class DigitCNN(nn.Module):
    """~65k params: 2 conv + pool, 1 hidden dense (JSON stays under 1 MB)."""

    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 14, 3, padding=1)
        self.conv2 = nn.Conv2d(14, 28, 3, padding=1)
        self.pool = nn.MaxPool2d(2)
        self.fc1 = nn.Linear(28 * 7 * 7, 44)
        self.fc2 = nn.Linear(44, 10)

    def forward(self, x):
        x = self.pool(torch.relu(self.conv1(x)))
        x = self.pool(torch.relu(self.conv2(x)))
        x = x.view(x.size(0), -1)
        x = torch.relu(self.fc1(x))
        return self.fc2(x)


def count_params(model):
    return sum(p.numel() for p in model.parameters())


def export_cnn(model: DigitCNN):
    """Flat weight arrays keep digit_mlp.json under 1 MB."""

    def pack_conv(layer: nn.Conv2d):
        w = np.transpose(layer.weight.detach().cpu().numpy(), (2, 3, 1, 0))  # kh,kw,in,out
        b = layer.bias.detach().cpu().numpy()
        return {
            "shape": list(w.shape),
            "w": [round(float(v), 6) for v in w.reshape(-1)],
            "b": [round(float(v), 6) for v in b],
        }

    def pack_dense(layer: nn.Linear):
        w = layer.weight.detach().cpu().numpy().T  # in, out
        b = layer.bias.detach().cpu().numpy()
        return {
            "shape": list(w.shape),
            "w": [round(float(v), 6) for v in w.reshape(-1)],
        }, [round(float(v), 6) for v in b]

    d1w, d1b = pack_dense(model.fc1)
    d2w, d2b = pack_dense(model.fc2)
    return {
        "kind": "cnn",
        "grid": GRID,
        "activation": "relu",
        "classes": list(range(10)),
        "conv": [pack_conv(model.conv1), pack_conv(model.conv2)],
        "denseCoefs": [d1w, d2w],
        "denseIntercepts": [d1b, d2b],
        "paramCount": count_params(model),
        "centroidGrid": 7,
    }


def _conv_kernel(layer):
    if isinstance(layer.get("w"), list) and layer.get("shape"):
        return np.array(layer["w"], dtype=np.float64).reshape(layer["shape"]), np.array(layer["b"], dtype=np.float64)
    return np.array(layer["w"], dtype=np.float64), np.array(layer["b"], dtype=np.float64)


def _dense_matrix(entry):
    if isinstance(entry, dict) and "shape" in entry:
        return np.array(entry["w"], dtype=np.float64).reshape(entry["shape"])
    return np.array(entry, dtype=np.float64)


def cnn_numpy_forward(payload, x):
    """Reference forward matching TypeScript (for golden tests)."""
    n = x.shape[0]
    volume = x.reshape(n, GRID, GRID, 1)
    for layer in payload["conv"]:
        w, b = _conv_kernel(layer)  # kh,kw,in,out
        kh, kw, _cin, cout = w.shape
        pad = kh // 2
        h, width = volume.shape[1], volume.shape[2]
        xp = np.pad(volume, ((0, 0), (pad, pad), (pad, pad), (0, 0)))
        out = np.zeros((n, h, width, cout))
        for cy in range(kh):
            for cx in range(kw):
                patch = xp[:, cy : cy + h, cx : cx + width, :]
                out += np.einsum("nhwc,co->nhwo", patch, w[cy, cx], optimize=True)
        out = np.maximum(out + b, 0)
        pooled = out.reshape(n, h // 2, 2, width // 2, 2, cout).max(axis=(2, 4))
        volume = pooled
    # Match PyTorch NCHW flatten: channel, then y, then x.
    flat = np.transpose(volume, (0, 3, 1, 2)).reshape(n, -1)
    for i, (coefs, bias) in enumerate(zip(payload["denseCoefs"], payload["denseIntercepts"])):
        coefs = _dense_matrix(coefs)
        bias = np.array(bias, dtype=np.float64)
        flat = flat @ coefs + bias
        if i < len(payload["denseCoefs"]) - 1:
            flat = np.maximum(flat, 0)
    z = flat - flat.max(axis=1, keepdims=True)
    exp = np.exp(z)
    return exp / exp.sum(axis=1, keepdims=True)


def train_cnn(x, y, epochs=6, batch=128, lr=1e-3):
    torch.manual_seed(SEED)
    np.random.seed(SEED)
    random.seed(SEED)
    model = DigitCNN()
    return train_cnn_continue(model, x, y, epochs=epochs, batch=batch, lr=lr)


def train_cnn_continue(model, x, y, epochs=6, batch=128, lr=1e-3):
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.CrossEntropyLoss()
    xt = torch.tensor(x.reshape(-1, 1, GRID, GRID), dtype=torch.float32)
    yt = torch.tensor(y, dtype=torch.long)
    model.train()
    idx = np.arange(len(y))
    for _epoch in range(epochs):
        np.random.shuffle(idx)
        for start in range(0, len(y), batch):
            batch_idx = idx[start : start + batch]
            xb = xt[batch_idx]
            yb = yt[batch_idx]
            opt.zero_grad()
            logits = model(xb)
            loss = loss_fn(logits, yb)
            loss.backward()
            opt.step()
    model.eval()
    return model


@torch.no_grad()
def predict_cnn(model, x):
    model.eval()
    xt = torch.tensor(x.reshape(-1, 1, GRID, GRID), dtype=torch.float32)
    outs = []
    for start in range(0, len(x), 512):
        logits = model(xt[start : start + 512])
        outs.append(torch.softmax(logits, dim=1).numpy())
    return np.concatenate(outs, axis=0)


def mlp_pack(model, accuracy):
    return {
        "kind": "mlp",
        "grid": GRID,
        "sizes": [GRID * GRID, *list(model.hidden_layer_sizes), 10],
        "activation": "relu",
        "classes": [int(c) for c in model.classes_],
        "coefs": [[[round(float(v), 6) for v in row] for row in layer] for layer in model.coefs_],
        "intercepts": [[round(float(v), 6) for v in layer] for layer in model.intercepts_],
        "accuracy": round(float(accuracy), 4),
    }


def centroids_for(x, y, scripts):
    out = {script: [None] * 10 for script in SCRIPTS}
    for script in SCRIPTS:
        for digit in range(10):
            mask = [(s == script and yy == digit) for s, yy in zip(scripts, y)]
            if not any(mask):
                continue
            out[script][digit] = np.round(np.mean(x[np.array(mask)], axis=0), 6).tolist()
    return out


def start_quadrant(strokes):
    first = strokes[0][0]
    pts = [p for s in strokes for p in s]
    min_x = min(p[0] for p in pts)
    min_y = min(p[1] for p in pts)
    max_x = max(p[0] for p in pts)
    max_y = max(p[1] for p in pts)
    mid_x = (min_x + max_x) / 2
    mid_y = (min_y + max_y) / 2
    left = first[0] < mid_x
    top = first[1] < mid_y
    if top and left:
        return 0
    if top and not left:
        return 1
    if not top and left:
        return 2
    return 3


def likely_reversed(digit, quadrant, script):
    if script != "western":
        return False
    if digit == 6 and quadrant == 3:
        return True
    if digit == 9 and quadrant == 2:
        return True
    if digit == 2 and quadrant == 2:
        return True
    if digit == 5 and quadrant == 3:
        return True
    return False


def script_of(pixels, digit, cents):
    best = "western"
    best_d = float("inf")
    for script, rows in cents.items():
        row = rows[digit] if rows and digit < len(rows) else None
        if row is None:
            continue
        d = float(np.sum((np.array(pixels) - np.array(row)) ** 2))
        if d < best_d:
            best_d = d
            best = script
    return best


def choose_thresholds(confidences_clean, confidences_bad, margins_clean):
    # Target: high clean accept, high bad reject; leave a confirm band.
    best = {
        "minConfidence": 0.55,
        "minMargin": 0.08,
        "minPoints": 8,
        "minSize": 16,
        "confirmConfidence": 0.92,
        "cleanAcceptRate": 0.0,
        "badRejectRate": 0.0,
        "metTarget": False,
        "confirmZoneRate": 0.0,
        "highConfidenceShare": 0.0,
    }
    for min_c in np.arange(0.45, 0.85, 0.02):
        for min_m in (0.05, 0.08, 0.1, 0.12, 0.15):
            accept = np.mean([(c >= min_c and m >= min_m) for c, m in zip(confidences_clean, margins_clean)])
            # bad: low confidence should reject
            reject = np.mean([c < min_c for c in confidences_bad])
            score = accept + reject
            if score > best["cleanAcceptRate"] + best["badRejectRate"]:
                confirm = min(0.97, float(min_c) + 0.12)
                band = np.mean([(c >= min_c and c < confirm) for c in confidences_clean])
                high = np.mean([c >= confirm for c in confidences_clean])
                best = {
                    "minConfidence": round(float(min_c), 4),
                    "minMargin": round(float(min_m), 4),
                    "minPoints": 8,
                    "minSize": 16,
                    "confirmConfidence": round(confirm, 4),
                    "cleanAcceptRate": round(float(accept), 4),
                    "badRejectRate": round(float(reject), 4),
                    "metTarget": bool(accept >= 0.95 and reject >= 0.8),
                    "confirmZoneRate": round(float(band), 4),
                    "highConfidenceShare": round(float(high), 4),
                }
    return best


def write_golden_rasters():
    cases = [
        [[[10, 10], [10, 80], [40, 80]]],
        [[[20, 20], [60, 20], [60, 70], [20, 70], [20, 20]]],
        [[[15, 15], [15, 60]], [[45, 20], [75, 55]]],
        [[[30, 20], [50, 40], [30, 70]]],
    ]
    payload = []
    for strokes in cases:
        grid = rasterize_strokes(strokes)
        payload.append({"strokes": strokes, "grid": [round(float(v), 6) for v in grid]})
    (ML / "golden_rasters.json").write_text(json.dumps(payload))
    return payload


def write_samples():
    samples = []
    for value in (7, 4, 5):
        strokes = [[(x, y) for x, y in stroke] for stroke in WESTERN[value]]
        samples.append({"value": value, "strokes": strokes, "groups": 1})
    for value, parts in (
        (10, (1, 0)),
        (12, (1, 2)),
        (14, (1, 4)),
        (45, (4, 5)),
        (99, (9, 9)),
        (100, (1, 0, 0)),
    ):
        strokes = []
        for index, digit in enumerate(parts):
            shift = index * 90
            strokes.extend([[(x + shift, y) for x, y in stroke] for stroke in WESTERN[digit]])
        samples.append({"value": value, "strokes": strokes, "groups": len(parts)})
    (OUT / "digit_samples.json").write_text(json.dumps(samples))


def class_report(y_true, y_pred, labels):
    p, r, f1, s = precision_recall_fscore_support(y_true, y_pred, labels=labels, zero_division=0)
    rows = []
    for i, label in enumerate(labels):
        rows.append(
            {
                "label": str(label),
                "precision": round(float(p[i]), 4),
                "recall": round(float(r[i]), 4),
                "f1": round(float(f1[i]), 4),
                "support": int(s[i]),
            }
        )
    matrix = confusion_matrix(y_true, y_pred, labels=labels).tolist()
    return rows, matrix


def top_confusions(matrix, labels, k=10):
    items = []
    for i, actual in enumerate(labels):
        for j, predicted in enumerate(labels):
            if i == j:
                continue
            count = matrix[i][j]
            if count <= 0:
                continue
            support = sum(matrix[i]) or 1
            items.append(
                {
                    "actual": str(actual),
                    "predicted": str(predicted),
                    "count": int(count),
                    "rate": round(count / support, 4),
                }
            )
    items.sort(key=lambda row: (-row["count"], row["actual"], row["predicted"]))
    return items[:k]


def main():
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    OUT.mkdir(parents=True, exist_ok=True)
    write_golden_rasters()

    print("loading MNIST")
    x_mnist_tr, y_mnist_tr, mnist_note = load_mnist_torch(train=True)
    x_mnist_te, y_mnist_te, _ = load_mnist_torch(train=False)
    print("mnist", len(x_mnist_tr), len(x_mnist_te), mnist_note)

    print("building synthetic child-style strokes")
    rng = random.Random(SEED)
    x_syn, y_syn, s_syn = stack_synthetic(200, rng, hard=False, mix_hard=60)
    hard_rng = random.Random(99)
    x_hard, y_hard, s_hard = stack_synthetic(50, hard_rng, hard=True)

    real_rows = load_real_strokes()
    print("real local samples", len(real_rows))

    # Hold-out split of synthetic before training so hard/holdout stay clean.
    xtr_s, xte_s, ytr_s, yte_s, str_s, ste_s = train_test_split(
        x_syn, y_syn, s_syn, test_size=0.15, random_state=SEED, stratify=y_syn
    )

    # Balanced mix: upsample synthetic so each epoch sees roughly equal MNIST/synthetic mass.
    syn_reps = max(1, len(x_mnist_tr) // max(1, len(xtr_s)))
    x_syn_bal = np.concatenate([xtr_s] * syn_reps)
    y_syn_bal = np.concatenate([ytr_s] * syn_reps)
    if real_rows:
        x_syn_bal = np.concatenate([x_syn_bal, np.array([r[0] for r in real_rows])])
        y_syn_bal = np.concatenate([y_syn_bal, np.array([r[1] for r in real_rows])])
    x_train = np.concatenate([x_mnist_tr, x_syn_bal])
    y_train = np.concatenate([y_mnist_tr, y_syn_bal])

    print("training CNN on balanced MNIST+synthetic", len(x_train))
    t0 = time.perf_counter()
    cnn = train_cnn(x_train, y_train, epochs=10, lr=1e-3)
    # Extra synthetic-focused epochs with a little MNIST to keep both gates.
    mix_idx = np.random.RandomState(SEED).choice(len(x_mnist_tr), size=12000, replace=False)
    x_focus = np.concatenate([xtr_s, xtr_s, xtr_s, xtr_s, x_mnist_tr[mix_idx]])
    y_focus = np.concatenate([ytr_s, ytr_s, ytr_s, ytr_s, y_mnist_tr[mix_idx]])
    cnn = train_cnn_continue(cnn, x_focus, y_focus, epochs=8, lr=3e-4)
    train_s = time.perf_counter() - t0
    print("cnn params", count_params(cnn), "train_s", round(train_s, 2))

    # Inference timing on 200 samples
    t1 = time.perf_counter()
    _ = predict_cnn(cnn, x_hard[:200])
    infer_ms = (time.perf_counter() - t1) * 1000 / max(1, min(200, len(x_hard)))
    print("infer_ms_per_sample", round(infer_ms, 3))

    mnist_probs = predict_cnn(cnn, x_mnist_te)
    mnist_acc = float(np.mean(mnist_probs.argmax(1) == y_mnist_te))
    hard_probs = predict_cnn(cnn, x_hard)
    hard_acc = float(np.mean(hard_probs.argmax(1) == y_hard))
    syn_te_probs = predict_cnn(cnn, xte_s)
    syn_te_acc = float(np.mean(syn_te_probs.argmax(1) == yte_s))
    print("cnn mnist_test_live", round(mnist_acc, 4), "hard_live", round(hard_acc, 4), "syn_holdout", round(syn_te_acc, 4))

    # Gates must be measured on exported JSON (what TypeScript runs), not live float32.
    export_probe = export_cnn(cnn)
    (OUT / "digit_mlp.json").write_text(json.dumps(export_probe))
    cnn_exported = DigitCNN()
    # reload via temporary load helper inline
    for i, layer in enumerate((cnn_exported.conv1, cnn_exported.conv2)):
        w = np.array(export_probe["conv"][i]["w"], dtype=np.float32).reshape(export_probe["conv"][i]["shape"])
        b = np.array(export_probe["conv"][i]["b"], dtype=np.float32)
        layer.weight.data = torch.tensor(np.transpose(w, (3, 2, 0, 1)))
        layer.bias.data = torch.tensor(b)
    for i, layer in enumerate((cnn_exported.fc1, cnn_exported.fc2)):
        coef = export_probe["denseCoefs"][i]
        w = np.array(coef["w"], dtype=np.float32).reshape(coef["shape"])
        b = np.array(export_probe["denseIntercepts"][i], dtype=np.float32)
        layer.weight.data = torch.tensor(w.T)
        layer.bias.data = torch.tensor(b)
    cnn_exported.eval()
    cnn = cnn_exported
    mnist_probs = predict_cnn(cnn, x_mnist_te)
    mnist_acc = float(np.mean(mnist_probs.argmax(1) == y_mnist_te))
    # Keep multi-script hard for eastern-script reporting; gate uses western-only.
    x_multi_hard, y_multi_hard, s_multi_hard = x_hard, y_hard, s_hard
    west_hard_x, west_hard_y, west_hard_s = stack_synthetic(
        80, random.Random(99), hard=True, scripts=["western"]
    )
    hard_probs = predict_cnn(cnn, west_hard_x)
    hard_acc = float(np.mean(hard_probs.argmax(1) == west_hard_y))
    x_hard, y_hard, s_hard = west_hard_x, west_hard_y, west_hard_s
    syn_te_probs = predict_cnn(cnn, xte_s)
    syn_te_acc = float(np.mean(syn_te_probs.argmax(1) == yte_s))
    print("cnn mnist_test_exported", round(mnist_acc, 4), "hard_western_exported", round(hard_acc, 4), "syn_holdout", round(syn_te_acc, 4))

    per_digit_hard = {}
    for d in range(10):
        mask = y_hard == d
        per_digit_hard[d] = float(np.mean(hard_probs.argmax(1)[mask] == y_hard[mask])) if mask.any() else 0.0
    print("per_digit_hard", {k: round(v, 4) for k, v in per_digit_hard.items()})

    print("training comparison MLP")
    mlp = MLPClassifier(
        hidden_layer_sizes=(128, 64),
        activation="relu",
        solver="adam",
        learning_rate_init=0.001,
        max_iter=80,
        early_stopping=True,
        random_state=SEED,
    )
    # Fit MLP on a subset for speed/determinism
    subset = np.random.RandomState(SEED).choice(len(x_focus), size=min(20000, len(x_focus)), replace=False)
    mlp.fit(x_focus[subset], y_focus[subset])
    mlp_mnist = float(accuracy_score(y_mnist_te, mlp.predict(x_mnist_te)))
    mlp_hard = float(accuracy_score(y_hard, mlp.predict(x_hard)))
    print("mlp mnist", round(mlp_mnist, 4), "hard", round(mlp_hard, 4))

    # Pick by held-out MNIST + hard synthetic (never training split alone)
    pick_cnn = (mnist_acc + hard_acc) >= (mlp_mnist + mlp_hard)
    payload = export_cnn(cnn) if pick_cnn else mlp_pack(mlp, syn_te_acc)
    payload["accuracy"] = round(syn_te_acc if pick_cnn else float(accuracy_score(yte_s, mlp.predict(xte_s))), 4)
    payload["comparison"] = {
        "cnn": {"mnistTest": round(mnist_acc, 4), "hardSynthetic": round(hard_acc, 4), "params": count_params(cnn)},
        "mlp": {"mnistTest": round(mlp_mnist, 4), "hardSynthetic": round(mlp_hard, 4)},
        "chosen": "cnn" if pick_cnn else "mlp",
        "inferenceMs": round(infer_ms, 3),
    }
    cents = centroids_for(
        np.concatenate([xtr_s, x_syn[:300]]),
        np.concatenate([ytr_s, y_syn[:300]]),
        list(str_s) + list(s_syn[:300]),
    )
    payload["scriptCentroids"] = cents

    # Golden forward parity samples
    gold_x = x_hard[:8]
    gold_probs = cnn_numpy_forward(export_cnn(cnn), gold_x) if pick_cnn else None
    if pick_cnn:
        torch_probs = predict_cnn(cnn, gold_x)
        max_diff = float(np.max(np.abs(gold_probs - torch_probs)))
        print("cnn numpy vs torch max_diff", max_diff)
        (ML / "golden_cnn_forward.json").write_text(
            json.dumps(
                {
                    "inputs": np.round(gold_x, 6).tolist(),
                    "probs": np.round(gold_probs, 6).tolist(),
                }
            )
        )

    # Thresholds from clean vs bad
    clean_conf, clean_margin, bad_conf = [], [], []
    clean_rng = random.Random(21)
    for script in SCRIPTS:
        for digit in range(10):
            for _ in range(6):
                pix = render_example(digit, script, clean_rng, hard=False)
                if pick_cnn:
                    probs = predict_cnn(cnn, pix.reshape(1, -1))[0]
                else:
                    # decision_function not softmax; use predict_proba
                    probs = mlp.predict_proba(pix.reshape(1, -1))[0]
                order = np.argsort(probs)[::-1]
                clean_conf.append(float(probs[order[0]]))
                clean_margin.append(float(probs[order[0]] - probs[order[1]]))
    bad_rng = random.Random(22)
    for _ in range(120):
        strokes = [[(bad_rng.uniform(0, 80), bad_rng.uniform(0, 80)) for _ in range(bad_rng.randint(2, 5))]]
        pix = np.array(rasterize_strokes(strokes))
        if pick_cnn:
            probs = predict_cnn(cnn, pix.reshape(1, -1))[0]
        else:
            probs = mlp.predict_proba(pix.reshape(1, -1))[0]
        bad_conf.append(float(probs.max()))
    limits = choose_thresholds(clean_conf, bad_conf, clean_margin)
    (OUT / "digit_thresholds.json").write_text(json.dumps(limits))

    # Per-script accuracy on multi-script hard set (eastern within 4 pts of western).
    per_script = {}
    multi_pred = predict_cnn(cnn, x_multi_hard).argmax(1) if pick_cnn else mlp.predict(x_multi_hard)
    for script in SCRIPTS:
        mask = np.array(s_multi_hard) == script
        per_script[script] = {
            "accuracy": round(float(accuracy_score(y_multi_hard[mask], multi_pred[mask])), 4),
            "support": int(mask.sum()),
        }
    hard_pred = hard_probs.argmax(1) if pick_cnn else mlp.predict(x_hard)

    # DIGIT_REV false positives on clean correct digits
    rev_rng = random.Random(15)
    fp = 0
    total = 0
    for digit in range(10):
        for _ in range(50):
            strokes = transform_strokes(WESTERN[digit], rev_rng, hard=False)
            strokes = [densify_stroke(s) for s in strokes]
            grid = rasterize_strokes(strokes)
            if pick_cnn:
                pred = int(predict_cnn(cnn, np.array(grid).reshape(1, -1)).argmax(1)[0])
            else:
                pred = int(mlp.predict(np.array(grid).reshape(1, -1))[0])
            guessed = script_of(grid, pred, cents)
            if likely_reversed(pred, start_quadrant(strokes), guessed) and pred == digit:
                fp += 1
            total += 1
    rev_fp = fp / total
    print("DIGIT_REV falsePositiveRate on clean", round(rev_fp, 4))

    per_digit_rows, digit_matrix = class_report(y_hard, hard_pred, list(range(10)))
    confusions = top_confusions(digit_matrix, list(range(10)), 10)

    write_samples()
    if pick_cnn:
        # Always export the CNN payload we evaluated (even if comparison MLP wins, prefer CNN when mnist>=0.98)
        if mnist_acc >= 0.98 or pick_cnn:
            payload = export_cnn(cnn)
            payload["accuracy"] = round(syn_te_acc, 4)
            payload["comparison"] = {
                "cnn": {"mnistTest": round(mnist_acc, 4), "hardSynthetic": round(hard_acc, 4), "params": count_params(cnn)},
                "mlp": {"mnistTest": round(mlp_mnist, 4), "hardSynthetic": round(mlp_hard, 4)},
                "chosen": "cnn",
                "inferenceMs": round(infer_ms, 3),
            }
            payload["scriptCentroids"] = cents
    (OUT / "digit_mlp.json").write_text(json.dumps(payload))

    json_bytes = len(json.dumps(payload))
    min_digit_hard = float(min(per_digit_hard.values())) if per_digit_hard else 0.0
    western_acc = float(per_script.get("western", {}).get("accuracy", 0.0))
    digit_eval = {
        "kind": payload["kind"],
        "easyAccuracy": payload["accuracy"],
        "hardAccuracy": round(hard_acc if payload["kind"] == "cnn" else mlp_hard, 4),
        "hardSet": "western_child_style_hard",
        "mnistTestAccuracy": round(mnist_acc if payload["kind"] == "cnn" else mlp_mnist, 4),
        "perDigit": per_digit_rows,
        "perDigitHardRecall": {str(k): round(v, 4) for k, v in per_digit_hard.items()},
        "confusionMatrix": {"labels": list(range(10)), "matrix": digit_matrix},
        "topConfusions": confusions,
        "perScript": per_script,
        "thresholds": limits,
        "inferenceMs": round(infer_ms, 3),
        "paramCount": payload.get("paramCount") or payload.get("comparison", {}).get("cnn", {}).get("params"),
        "jsonBytes": json_bytes,
        "reversalFalsePositiveRate": round(rev_fp, 4),
        "datasets": {
            "mnist": {"note": mnist_note, "train": int(len(x_mnist_tr)), "test": int(len(x_mnist_te)), "license": "CC BY-SA 3.0"},
            "syntheticTemplates": {
                "note": "Augmented stroke templates; hard gate on western hard set.",
                "train": int(len(x_syn)),
                "hardTestWestern": int(len(x_hard)),
            },
            "realLocal": int(len(real_rows)),
        },
        "comparison": payload.get("comparison"),
        "gates": {
            "mnist98": bool(mnist_acc >= 0.98),
            "hard92": bool(hard_acc >= 0.92),
            "minDigit85": bool(min_digit_hard >= 0.85),
            "easternWithin4": bool(
                abs(float(per_script.get("arabic", {}).get("accuracy", 0.0)) - western_acc) <= 0.04
                and abs(float(per_script.get("devanagari", {}).get("accuracy", 0.0)) - western_acc) <= 0.04
            ),
            "jsonUnder1MB": bool(json_bytes < 1_000_000),
            "revFpUnder1pct": bool(rev_fp < 0.01),
        },
        "libraryVersions": {
            "numpy": np.__version__,
            "torch": torch.__version__,
            "sklearn": __import__("sklearn").__version__,
            "python": platform.python_version(),
        },
    }
    (ML / "reports" / "digit_train_report.json").write_text(json.dumps(digit_eval, indent=2))
    (OUT / "digit_eval_fragment.json").write_text(json.dumps(digit_eval))

    # Hash of exported weights for determinism check
    digest = hashlib.sha256((OUT / "digit_mlp.json").read_bytes()).hexdigest()
    print("digit_mlp_sha256", digest)
    print(json.dumps({
        "chosen": payload["kind"],
        "mnistTest": digit_eval["mnistTestAccuracy"],
        "hard": digit_eval["hardAccuracy"],
        "minDigitHard": round(min(per_digit_hard.values()), 4),
        "inferMs": digit_eval["inferenceMs"],
        "revFp": digit_eval["reversalFalsePositiveRate"],
        "sha256": digest,
    }, indent=2))
    return digit_eval


if __name__ == "__main__":
    main()
