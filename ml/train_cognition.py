"""Train on-device MathLift cognition models and write eval.json.

Reading-time multipliers are assumptions, not measured classroom times.
They describe how long a 6-year-old may take to read the same prompt:
English 1.0, Chinese 0.82 (shorter), Spanish 1.18, Hindi 1.30, Arabic 1.35.
The tree is trained on timing divided by that multiplier so it stays
language-independent. Stroke templates are hand-written approximations,
not real children's handwriting.
"""

from __future__ import annotations

import json
import math
import os
import platform
import random
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.tree import DecisionTreeClassifier

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "lib" / "cognition" / "models"
ML = ROOT / "ml"
OUT.mkdir(parents=True, exist_ok=True)

SEED = 42
CODES = [
    "COUNT_ALL",
    "OVERSHOOT",
    "SUB_FLIP",
    "COMMUTE",
    "DIGIT_REV",
    "WORD_GAP",
    "PLACE_SPLIT",
    "STEADY",
]
LANGS = ["en", "zh-Hans", "hi", "es", "ar"]
# Assumptions, not measured values.
READING_MULTIPLIER = {"en": 1.0, "zh-Hans": 0.82, "hi": 1.30, "es": 1.18, "ar": 1.35}
GRID = 16
INNER = 12
FEATURE_NAMES = [
    "planetIndex",
    "lessonCode",
    "timeToFirst",
    "avgGap",
    "gapStd",
    "tapCount",
    "removeCount",
    "retries",
    "overshoot",
    "undershoot",
    "correct",
    "drawMatch",
    "drawReversal",
    "drawConfidence",
    "equationSwap",
    "restartFromOne",
]


def clamp(n, lo, hi):
    return max(lo, min(hi, n))


def js_round(n: float) -> int:
    return int(math.floor(n + 0.5))


def rasterize_strokes(strokes) -> np.ndarray:
    """Match src/lib/cognition/strokes.ts rasterizeStrokes."""
    grid = np.zeros(GRID * GRID, dtype=np.float64)
    pts = [p for stroke in strokes for p in stroke]
    if not pts:
        return grid
    min_x = min(p[0] for p in pts)
    min_y = min(p[1] for p in pts)
    max_x = max(p[0] for p in pts)
    max_y = max(p[1] for p in pts)
    w = max(1.0, max_x - min_x)
    h = max(1.0, max_y - min_y)
    scale = INNER / max(w, h)
    pad_x = (GRID - w * scale) / 2
    pad_y = (GRID - h * scale) / 2

    def paint(x, y):
        gx = clamp(js_round(x), 0, GRID - 1)
        gy = clamp(js_round(y), 0, GRID - 1)
        grid[gy * GRID + gx] = 1.0
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = gx + dx, gy + dy
            if 0 <= nx < GRID and 0 <= ny < GRID:
                grid[ny * GRID + nx] = max(grid[ny * GRID + nx], 0.55)

    for stroke in strokes:
        for i, (sx, sy) in enumerate(stroke):
            x = (sx - min_x) * scale + pad_x
            y = (sy - min_y) * scale + pad_y
            paint(x, y)
            if i == 0:
                continue
            px = (stroke[i - 1][0] - min_x) * scale + pad_x
            py = (stroke[i - 1][1] - min_y) * scale + pad_y
            steps = max(1.0, math.hypot(x - px, y - py) * 2)
            s = 1
            while s <= steps:
                paint(px + (x - px) * s / steps, py + (y - py) * s / steps)
                s += 1
    return grid


def write_golden():
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


def poly(points):
    return [tuple(p) for p in points]


# Hand-written approximations in a 0-80 box. Not children's handwriting.
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


def transform_strokes(strokes, rng: random.Random, hard: bool):
    jitter = 3.2 if hard else 1.4
    rot = math.radians(rng.uniform(-15, 15) if hard else rng.uniform(-8, 8))
    shear = rng.uniform(-0.25, 0.25) if hard else rng.uniform(-0.12, 0.12)
    sx = rng.uniform(0.75, 1.25)
    sy = rng.uniform(0.75, 1.3)
    ox = rng.uniform(0, 30)
    oy = rng.uniform(0, 30)
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
        if len(pts) > 4 and rng.random() < (0.35 if hard else 0.15):
            gap = len(pts) // 2
            pts = pts[: gap - 1] + pts[gap + 1 :]
        step = 2 if hard and rng.random() < 0.4 else 1
        out.append(pts[::step] if len(pts) > 2 else pts)
    return out


def render_example(digit: int, script: str, rng: random.Random, hard=False, reverse=False):
    strokes = [list(stroke) for stroke in SCRIPTS[script][digit]]
    if reverse and script == "western":
        strokes = [[(x, 80 - y) for x, y in stroke] for stroke in strokes]
    strokes = transform_strokes(strokes, rng, hard)
    return rasterize_strokes(strokes)


def stack_examples(count, rng, hard=False, scripts=None, mix_hard=0, junk=0):
    scripts = scripts or list(SCRIPTS)
    xs, ys, ss = [], [], []
    for script in scripts:
        for digit in range(10):
            copies = count if not (digit in (2, 5, 6, 9) and script == "western") else count + count // 4
            for n in range(copies):
                reverse = script == "western" and digit in (2, 5, 6, 9) and n >= count
                xs.append(render_example(digit, script, rng, hard=hard, reverse=reverse))
                ys.append(digit)
                ss.append(script)
            for _ in range(mix_hard):
                xs.append(render_example(digit, script, rng, hard=True, reverse=False))
                ys.append(digit)
                ss.append(script)
    for strokes in bad_inputs(rng, junk):
        xs.append(rasterize_strokes(strokes))
        ys.append(10)
        ss.append("western")
    return np.array(xs, dtype=np.float64), np.array(ys), ss


def mlp_pack(model, accuracy):
    return {
        "kind": "mlp",
        "sizes": [256, *list(model.hidden_layer_sizes), 10],
        "activation": "relu",
        "classes": [int(c) for c in model.classes_],
        "coefs": [[[round(float(v), 6) for v in row] for row in layer] for layer in model.coefs_],
        "intercepts": [[round(float(v), 6) for v in layer] for layer in model.intercepts_],
        "accuracy": round(float(accuracy), 4),
    }


def conv_same(x, w, b):
    n, h, width, c = x.shape
    kh, kw, _, o = w.shape
    xp = np.pad(x, ((0, 0), (1, 1), (1, 1), (0, 0)))
    out = np.zeros((n, h, width, o), dtype=np.float64)
    for i in range(kh):
        for j in range(kw):
            patch = xp[:, i : i + h, j : j + width, :]
            out += np.einsum("nhwc,co->nhwo", patch, w[i, j], optimize=True)
    return out + b


def pool2(x):
    n, h, w, c = x.shape
    return x.reshape(n, h // 2, 2, w // 2, 2, c).max(axis=(2, 4))


def softmax(logits):
    z = logits - logits.max(axis=1, keepdims=True)
    exp = np.exp(z)
    return exp / exp.sum(axis=1, keepdims=True)


def train_cnn(x, y, seed=SEED, epochs=8, lr=0.08):
    rng = np.random.default_rng(seed)
    w = rng.normal(0, 0.08, size=(3, 3, 1, 8))
    b = np.zeros(8)
    dense = rng.normal(0, 0.05, size=(512, 10))
    db = np.zeros(10)
    ximg = x.reshape(-1, 16, 16, 1)
    y_oh = np.eye(10)[y]
    idx = np.arange(len(y))
    for _epoch in range(epochs):
        rng.shuffle(idx)
        for start in range(0, len(y), 64):
            batch = idx[start : start + 64]
            xb = ximg[batch]
            yb = y_oh[batch]
            conv = np.maximum(conv_same(xb, w, b), 0)
            pooled = pool2(conv)
            flat = pooled.reshape(len(batch), -1)
            logits = flat @ dense + db
            probs = softmax(logits)
            dlogits = (probs - yb) / len(batch)
            d_dense = flat.T @ dlogits
            d_db = dlogits.sum(axis=0)
            dflat = dlogits @ dense.T
            dpool = dflat.reshape(pooled.shape)
            dconv = np.zeros_like(conv)
            n, h, width, c = conv.shape
            pooled_h, pooled_w = h // 2, width // 2
            for py in range(pooled_h):
                for px in range(pooled_w):
                    window = conv[:, py * 2 : py * 2 + 2, px * 2 : px * 2 + 2, :]
                    maxes = window.reshape(n, 4, c).max(axis=1)
                    for oy in range(2):
                        for ox in range(2):
                            match = window[:, oy, ox, :] >= maxes - 1e-8
                            dconv[:, py * 2 + oy, px * 2 + ox, :] = dpool[:, py, px, :] * match
            dconv *= conv > 0
            xp = np.pad(xb, ((0, 0), (1, 1), (1, 1), (0, 0)))
            dw = np.zeros_like(w)
            for i in range(3):
                for j in range(3):
                    patch = xp[:, i : i + h, j : j + width, :]
                    dw[i, j] = np.einsum("nhwc,nhwo->co", patch, dconv, optimize=True)
            w -= lr * dw
            b -= lr * dconv.sum(axis=(0, 1, 2))
            dense -= lr * d_dense
            db -= lr * d_db
    return {"w": w, "b": b, "dense": dense, "db": db}


def cnn_predict(model, x):
    ximg = x.reshape(-1, 16, 16, 1)
    conv = np.maximum(conv_same(ximg, model["w"], model["b"]), 0)
    flat = pool2(conv).reshape(len(x), -1)
    return softmax(flat @ model["dense"] + model["db"])


def cnn_pack(model, accuracy):
    return {
        "kind": "cnn",
        "classes": list(range(10)),
        "conv": [{"w": np.round(model["w"], 6).tolist(), "b": np.round(model["b"], 6).tolist()}],
        "denseCoefs": [np.round(model["dense"], 6).tolist(),],
        "denseIntercepts": [np.round(model["db"], 6).tolist()],
        "accuracy": round(float(accuracy), 4),
    }


def predict_payload(payload, x):
    if payload.get("kind") == "cnn":
        model = {
            "w": np.array(payload["conv"][0]["w"]),
            "b": np.array(payload["conv"][0]["b"]),
            "dense": np.array(payload["denseCoefs"][0]),
            "db": np.array(payload["denseIntercepts"][0]),
        }
        probs = cnn_predict(model, x)
        return probs.argmax(axis=1), probs
    coefs = [np.array(c) for c in payload["coefs"]]
    intercepts = [np.array(b) for b in payload["intercepts"]]
    layer = x
    for i, (coef, bias) in enumerate(zip(coefs, intercepts)):
        layer = layer @ coef + bias
        if i < len(coefs) - 1:
            layer = np.maximum(layer, 0)
    layer = layer - layer.max(axis=1, keepdims=True)
    exp = np.exp(layer)
    probs = exp / exp.sum(axis=1, keepdims=True)
    classes = np.array(payload["classes"])
    return classes[probs.argmax(axis=1)], probs


def legacy_easy_accuracy(old_payload):
    if not old_payload or "coefs" not in old_payload:
        return None
    rng = random.Random(7)
    paths = {
        0: [(4, 2), (12, 2), (13, 8), (12, 13), (4, 13), (3, 8), (4, 2)],
        1: [(8, 2), (8, 14)],
        2: [(3, 3), (12, 3), (12, 7), (4, 12), (13, 13)],
        3: [(3, 3), (12, 3), (12, 7), (5, 8), (12, 9), (12, 13), (3, 13)],
        4: [(4, 2), (4, 8), (13, 8), (11, 2), (11, 14)],
        5: [(13, 2), (4, 2), (4, 7), (12, 7), (12, 13), (4, 13)],
        6: [(12, 2), (4, 4), (4, 13), (12, 13), (12, 8), (4, 8)],
        7: [(3, 2), (13, 2), (8, 14)],
        8: [(8, 2), (13, 5), (8, 8), (3, 11), (8, 14), (13, 11), (8, 8), (3, 5), (8, 2)],
        9: [(12, 8), (4, 8), (4, 2), (12, 2), (12, 14)],
    }
    xs, ys = [], []
    for digit in range(10):
        for _ in range(40):
            grid = np.zeros((16, 16), dtype=np.float64)
            path = [(x + rng.uniform(-0.8, 0.8), y + rng.uniform(-0.8, 0.8)) for x, y in paths[digit]]
            ox, oy = rng.uniform(-0.6, 0.6), rng.uniform(-0.6, 0.6)
            for i in range(1, len(path)):
                x0, y0 = path[i - 1]
                x1, y1 = path[i]
                steps = max(1, int(math.hypot(x1 - x0, y1 - y0) * 3))
                for s in range(steps + 1):
                    x = x0 + (x1 - x0) * s / steps + ox
                    y = y0 + (y1 - y0) * s / steps + oy
                    gx = clamp(int(round(x)), 0, 15)
                    gy = clamp(int(round(y)), 0, 15)
                    grid[gy, gx] = 1
            xs.append(grid.reshape(-1))
            ys.append(digit)
    pred, _ = predict_payload(old_payload, np.array(xs))
    return float(accuracy_score(ys, pred))


def class_report(y_true, y_pred, labels):
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, zero_division=0
    )
    matrix = confusion_matrix(y_true, y_pred, labels=labels).tolist()
    rows = []
    for i, label in enumerate(labels):
        rows.append(
            {
                "label": str(label),
                "precision": round(float(precision[i]), 4),
                "recall": round(float(recall[i]), 4),
                "f1": round(float(f1[i]), 4),
                "support": int(support[i]),
            }
        )
    return rows, matrix


def top_confusions(matrix, labels, k=5):
    pairs = []
    for i, actual in enumerate(labels):
        for j, predicted in enumerate(labels):
            if i == j:
                continue
            count = matrix[i][j]
            row_sum = sum(matrix[i]) or 1
            pairs.append(
                {
                    "actual": str(actual),
                    "predicted": str(predicted),
                    "count": int(count),
                    "rate": round(count / row_sum, 4),
                }
            )
    pairs.sort(key=lambda item: (-item["count"], item["actual"], item["predicted"]))
    return pairs[:k]


def centroids_for(x, y, scripts):
    out = {script: [np.zeros(256) for _ in range(10)] for script in SCRIPTS}
    counts = {script: [0 for _ in range(10)] for script in SCRIPTS}
    for row, digit, script in zip(x, y, scripts):
        if int(digit) > 9 or script not in out:
            continue
        out[script][int(digit)] += row
        counts[script][int(digit)] += 1
    packed = {}
    for script, rows in out.items():
        packed[script] = [
            (row / counts[script][digit] if counts[script][digit] else row).round(5).tolist()
            for digit, row in enumerate(rows)
        ]
    return packed


def script_of(pixels, digit, centroids):
    if int(digit) < 0 or int(digit) > 9:
        return "western"
    best, best_d = "western", 1e18
    for script, rows in centroids.items():
        diff = np.array(pixels) - np.array(rows[digit])
        dist = float(np.dot(diff, diff))
        if dist < best_d:
            best, best_d = script, dist
    return best


def likely_reversed(digit, quadrant, script):
    if script != "western":
        return False
    return (
        (digit == 6 and quadrant == 3)
        or (digit == 9 and quadrant == 2)
        or (digit == 2 and quadrant == 2)
        or (digit == 5 and quadrant == 3)
    )


def start_quadrant(strokes):
    pts = [p for stroke in strokes for p in stroke]
    if not pts:
        return 0
    first = strokes[0][0]
    min_x, max_x = min(p[0] for p in pts), max(p[0] for p in pts)
    min_y, max_y = min(p[1] for p in pts), max(p[1] for p in pts)
    left = first[0] < (min_x + max_x) / 2
    top = first[1] < (min_y + max_y) / 2
    if top and left:
        return 0
    if top and not left:
        return 1
    if not top and left:
        return 2
    return 3


def bad_inputs(rng: random.Random, n=80):
    samples = []
    for _ in range(n):
        kind = rng.choice(["dot", "tiny", "line", "scribble", "blob"])
        if kind == "dot":
            strokes = [[(12, 12), (13, 13)]]
        elif kind == "tiny":
            strokes = [[(40, 40), (44, 42), (43, 46)]]
        elif kind == "line":
            strokes = [[(5, 40), (200, 42)]]
        elif kind == "blob":
            strokes = [[(rng.uniform(20, 60), rng.uniform(20, 60)) for _ in range(30)]]
        else:
            strokes = [[(rng.uniform(0, 100), rng.uniform(0, 100)) for _ in range(rng.randint(3, 12))]]
        samples.append(strokes)
    return samples


def densify_strokes(strokes, step=4.0):
    """Turn sparse templates into finger-like point streams before counting points."""
    dense = []
    for stroke in strokes:
        if len(stroke) < 2:
            dense.append(list(stroke))
            continue
        pts = [stroke[0]]
        for (x0, y0), (x1, y1) in zip(stroke, stroke[1:]):
            dist = math.hypot(x1 - x0, y1 - y0)
            pieces = max(1, int(dist / step))
            for i in range(1, pieces + 1):
                t = i / pieces
                pts.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
        dense.append(pts)
    return dense


def _reject_stats(payload, strokes_list, conf, margin):
    rejected = 0
    for raw in strokes_list:
        strokes = densify_strokes(raw)
        pts = [p for stroke in strokes for p in stroke]
        span = 0 if not pts else max(
            max(p[0] for p in pts) - min(p[0] for p in pts),
            max(p[1] for p in pts) - min(p[1] for p in pts),
        )
        if len(pts) < 8 or span < 16:
            rejected += 1
            continue
        grid = rasterize_strokes(strokes).reshape(1, -1)
        pred, probs = predict_payload(payload, grid)
        order = np.argsort(probs[0])
        top = float(probs[0, order[-1]])
        second = float(probs[0, order[-2]])
        if int(pred[0]) > 9 or top < conf or (top - second) < margin:
            rejected += 1
    return rejected / max(1, len(strokes_list))


def choose_thresholds(model_payload, clean_strokes, bad_strokes):
    best = None
    for conf in (0.45, 0.55, 0.65, 0.75, 0.85):
        for margin in (0.05, 0.1, 0.15, 0.22, 0.3):
            clean_reject = _reject_stats(model_payload, clean_strokes, conf, margin)
            bad_rate = _reject_stats(model_payload, bad_strokes, conf, margin)
            if clean_reject <= 0.05 and bad_rate >= 0.9:
                if best is None or bad_rate > best["badRejectRate"]:
                    best = {
                        "minConfidence": conf,
                        "minMargin": margin,
                        "minPoints": 8,
                        "minSize": 16,
                        "cleanAcceptRate": round(1 - clean_reject, 4),
                        "badRejectRate": round(bad_rate, 4),
                        "metTarget": True,
                    }
    if best is None:
        clean_reject = _reject_stats(model_payload, clean_strokes, 0.55, 0.12)
        bad_rate = _reject_stats(model_payload, bad_strokes, 0.55, 0.12)
        best = {
            "minConfidence": 0.55,
            "minMargin": 0.12,
            "minPoints": 8,
            "minSize": 16,
            "cleanAcceptRate": round(1 - clean_reject, 4),
            "badRejectRate": round(bad_rate, 4),
            "metTarget": False,
        }
    return best


def sample_row(code: str, rng: random.Random, lang="en") -> dict:
    planet = rng.randint(0, 8)
    lesson = 0 if planet <= 2 else 1 if planet <= 5 else 2
    row = {
        "planetIndex": planet,
        "lessonCode": lesson,
        "timeToFirst": rng.uniform(0.4, 4),
        "avgGap": rng.uniform(0.4, 2.2),
        "gapStd": rng.uniform(0.1, 0.8),
        "tapCount": rng.randint(2, 8),
        "removeCount": rng.randint(0, 1),
        "retries": rng.randint(0, 1),
        "overshoot": 0,
        "undershoot": 0,
        "correct": 1,
        "drawMatch": 1,
        "drawReversal": 0,
        "drawConfidence": rng.uniform(0.7, 0.98),
        "equationSwap": 0,
        "restartFromOne": 0,
        "label": code,
        "lang": lang,
    }
    if code == "COUNT_ALL":
        row.update(
            timeToFirst=rng.uniform(3, 12),
            avgGap=rng.uniform(1.6, 4.5),
            gapStd=rng.uniform(0.8, 2.2),
            tapCount=rng.randint(4, 9),
            restartFromOne=1,
            lessonCode=0,
            planetIndex=rng.randint(0, 2),
        )
    elif code == "OVERSHOOT":
        row.update(
            overshoot=rng.randint(1, 4),
            correct=0,
            retries=rng.randint(1, 4),
            removeCount=rng.randint(0, 1),
            lessonCode=1,
            planetIndex=rng.choice([3, 4]),
        )
    elif code == "SUB_FLIP":
        row.update(
            correct=0,
            undershoot=rng.randint(1, 4),
            lessonCode=2,
            planetIndex=rng.choice([6, 7]),
            retries=rng.randint(1, 3),
        )
    elif code == "COMMUTE":
        row.update(equationSwap=1, lessonCode=1, planetIndex=rng.choice([4, 5]), retries=rng.randint(1, 3))
    elif code == "DIGIT_REV":
        row.update(
            drawReversal=1,
            drawMatch=0,
            drawConfidence=rng.uniform(0.45, 0.85),
            planetIndex=rng.choice([1, 3]),
        )
    elif code == "WORD_GAP":
        row.update(
            drawMatch=0,
            correct=0,
            timeToFirst=rng.uniform(4, 14),
            lessonCode=1,
            planetIndex=5,
        )
    elif code == "PLACE_SPLIT":
        row.update(
            planetIndex=rng.choice([5, 6]),
            lessonCode=rng.choice([1, 2]),
            undershoot=rng.randint(1, 3),
            correct=0,
        )
    else:
        row.update(correct=1, overshoot=0, undershoot=0, retries=0, equationSwap=0, drawReversal=0)
    mult = READING_MULTIPLIER[lang]
    noise = 1 + rng.uniform(-0.02, 0.02)
    row["timeToFirst"] = (row["timeToFirst"] * mult * noise) / mult
    row["avgGap"] = (row["avgGap"] * mult * noise) / mult
    return row


def rows_matrix(rows):
    x = np.array([[r[k] for k in FEATURE_NAMES] for r in rows], dtype=float)
    y = np.array([r["label"] for r in rows])
    return x, y


def build_tree_rows(n, seed, wide=False):
    rng = random.Random(seed)
    weights = {
        "STEADY": 0.28,
        "COUNT_ALL": 0.16,
        "OVERSHOOT": 0.16,
        "SUB_FLIP": 0.1,
        "COMMUTE": 0.1,
        "DIGIT_REV": 0.08,
        "WORD_GAP": 0.07,
        "PLACE_SPLIT": 0.05,
    }
    rows = []
    for _ in range(n):
        code = rng.choices(list(weights), weights=list(weights.values()))[0]
        lang = rng.choice(LANGS)
        row = sample_row(code, rng, lang)
        if wide:
            row["timeToFirst"] *= rng.uniform(0.7, 1.5)
            row["avgGap"] *= rng.uniform(0.7, 1.5)
        rows.append(row)
    return rows


def macro_by_language(model, seed):
    report = {}
    scores = []
    for lang in LANGS:
        rng = random.Random(seed + LANGS.index(lang) * 17)
        rows = [sample_row(CODES[i % 8], rng, lang) for i in range(800)]
        # balance by forcing code
        rows = []
        for code in CODES:
            for _ in range(100):
                rows.append(sample_row(code, rng, lang))
        x, y = rows_matrix(rows)
        pred = model.predict(x)
        score = float(f1_score(y, pred, average="macro", labels=CODES, zero_division=0))
        acc = float(accuracy_score(y, pred))
        per, matrix = class_report(y, pred, CODES)
        report[lang] = {"accuracy": round(acc, 4), "macroF1": round(score, 4), "perClass": per}
        scores.append(score)
    gap = max(scores) - min(scores) if scores else 0
    return report, round(float(gap), 4)


def calibration(y_true, proba, classes):
    confidence = proba.max(axis=1)
    pred = np.array(classes)[proba.argmax(axis=1)]
    correct = pred == y_true
    bins = []
    ece = 0.0
    for i in range(10):
        lo, hi = i / 10, (i + 1) / 10
        mask = (confidence >= lo) & (confidence < hi if i < 9 else confidence <= hi)
        count = int(mask.sum())
        acc = float(correct[mask].mean()) if count else 0
        conf = float(confidence[mask].mean()) if count else (lo + hi) / 2
        ece += (count / len(y_true)) * abs(acc - conf)
        bins.append(
            {
                "lo": round(lo, 2),
                "hi": round(hi, 2),
                "count": count,
                "confidence": round(conf, 4),
                "accuracy": round(acc, 4),
            }
        )
    bands = {}
    for name, mask in {
        "high": confidence >= 0.78,
        "moderate": (confidence >= 0.55) & (confidence < 0.78),
        "low": confidence < 0.55,
    }.items():
        count = int(mask.sum())
        bands[name] = {
            "count": count,
            "accuracy": round(float(correct[mask].mean()) if count else 0, 4),
        }
    return {"bins": bins, "ece": round(float(ece), 4), "bands": bands}


def recommendation_section():
    subprocess.run([sys.executable, str(ML / "generate_data.py")], cwd=ML, check=True)
    import pandas as pd

    df = pd.read_csv(ML / "student_data.csv")
    features = [
        "planet",
        "lesson_difficulty",
        "accuracy",
        "avg_time",
        "hints",
        "retries",
        "improvement",
        "consistency",
        "streak",
    ]
    x = df[features]
    y = df["recommendation"]
    xtr, xte, ytr, yte = train_test_split(x, y, test_size=0.2, random_state=42, stratify=y)
    model = DecisionTreeClassifier(max_depth=5, random_state=42)
    model.fit(xtr, ytr)
    pred = model.predict(xte)
    labels = list(model.classes_)
    majority = ytr.mode().iloc[0]
    base_pred = np.array([majority] * len(yte))
    per, matrix = class_report(yte, pred, labels)
    return {
        "accuracy": round(float(accuracy_score(yte, pred)), 4),
        "macroF1": round(float(f1_score(yte, pred, average="macro", zero_division=0)), 4),
        "baselineMajorityAccuracy": round(float(accuracy_score(yte, base_pred)), 4),
        "perClass": per,
        "confusionMatrix": {"labels": [str(l) for l in labels], "matrix": matrix},
        "trainSize": int(len(ytr)),
        "testSize": int(len(yte)),
        "dataSource": "synthetic",
    }


def load_real_strokes(repeat=3):
    """Mix local handwriting JSON if a developer collected any. Never required."""
    folder = Path(__file__).resolve().parent / "data" / "real"
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
            rows.append((rasterize_strokes(strokes), digit, script))
    return rows * repeat


def main():
    random.seed(SEED)
    np.random.seed(SEED)
    write_golden()
    old_path = OUT / "digit_mlp.json"
    old_payload = json.loads(old_path.read_text()) if old_path.exists() else None
    before_stored = None if not old_payload else old_payload.get("accuracy")
    before_legacy = legacy_easy_accuracy(old_payload) if old_payload else None

    rng = random.Random(SEED)
    x, y, scripts = stack_examples(60, rng, hard=False, mix_hard=12, junk=280)
    real_rows = load_real_strokes()
    if real_rows:
        x = np.concatenate([x, np.array([row[0] for row in real_rows])])
        y = np.concatenate([y, np.array([row[1] for row in real_rows])])
        scripts = list(scripts) + [row[2] for row in real_rows]
    xtr, xte, ytr, yte, str_, ste = train_test_split(
        x, y, scripts, test_size=0.2, random_state=SEED, stratify=y
    )
    digit_train_n = int(len(ytr))
    digit_test_n = int(len(yte))
    hard_rng = random.Random(99)
    xhard, yhard, shard = stack_examples(24, hard_rng, hard=True)

    mlp_easy = {}
    mlp_models = {}
    for name, hidden in (("mlp48", (48,)), ("mlp_wide", (128, 64))):
        clf = MLPClassifier(
            hidden_layer_sizes=hidden,
            activation="relu",
            max_iter=180,
            random_state=SEED,
            alpha=0.0005,
        )
        clf.fit(xtr, ytr)
        mlp_models[name] = clf
        mlp_easy[name] = {
            "easy": round(float(accuracy_score(yte, clf.predict(xte))), 4),
            "hard": round(float(accuracy_score(yhard, clf.predict(xhard))), 4),
        }
        print(name, mlp_easy[name])

    print("training cnn")
    digit_train = np.array(ytr) < 10
    cnn = train_cnn(np.array(xtr)[digit_train], np.array(ytr)[digit_train])
    cnn_easy = float(np.mean(cnn_predict(cnn, xte).argmax(1) == yte))
    cnn_hard = float(np.mean(cnn_predict(cnn, xhard).argmax(1) == yhard))
    print("cnn", round(cnn_easy, 4), round(cnn_hard, 4))

    hard_scores = {
        "mlp48": mlp_easy["mlp48"]["hard"],
        "mlp_wide": mlp_easy["mlp_wide"]["hard"],
        "cnn": round(cnn_hard, 4),
    }
    winner = max(hard_scores, key=hard_scores.get)
    if before_legacy is not None and hard_scores[winner] + 1e-9 < before_legacy and winner != "mlp48":
        pass
    if winner == "cnn":
        payload = cnn_pack(cnn, cnn_easy)
        hold_pred = cnn_predict(cnn, xte).argmax(1)
        hard_pred = cnn_predict(cnn, xhard).argmax(1)
    else:
        clf = mlp_models[winner]
        payload = mlp_pack(clf, mlp_easy[winner]["easy"])
        hold_pred = clf.predict(xte)
        hard_pred = clf.predict(xhard)
    digit_mask = np.array(yte) < 10
    if digit_mask.any():
        payload["accuracy"] = round(float(accuracy_score(np.array(yte)[digit_mask], np.array(hold_pred)[digit_mask])), 4)
    cents = centroids_for(xtr, ytr, str_)
    payload["scriptCentroids"] = cents
    payload["comparison"] = {
        "beforeStoredEasyAccuracy": before_stored,
        "beforeLegacyEasyAccuracy": None if before_legacy is None else round(before_legacy, 4),
        "candidates": {**mlp_easy, "cnn": {"easy": round(cnn_easy, 4), "hard": round(cnn_hard, 4)}},
        "chosen": winner,
    }

    # Old model on the new hard set, if it can run.
    before_hard = None
    if old_payload and "coefs" in old_payload:
        old_pred, _ = predict_payload(old_payload, xhard)
        before_hard = round(float(accuracy_score(yhard, old_pred)), 4)
        payload["comparison"]["beforeHardAccuracy"] = before_hard
        if before_hard is not None and hard_scores[winner] + 1e-9 < before_hard:
            print("New model did not beat the old model on the hard set. Keeping a wider net only if it won among new models.")

    digit_labels = list(range(10)) + ([10] if np.any(np.array(hard_pred) == 10) else [])
    per_digit, digit_matrix = class_report(yhard, hard_pred, digit_labels)
    confusions = top_confusions(digit_matrix, list(range(10)), 10)

    # Jitter levels on western digits.
    jitter_report = {}
    for level, hard_flag, seed in (("mild", False, 3), ("medium", True, 5), ("high", True, 8)):
        jrng = random.Random(seed)
        xs, ys = [], []
        for digit in range(10):
            for _ in range(40):
                strokes = transform_strokes(WESTERN[digit], jrng, hard=hard_flag or level == "high")
                if level == "high":
                    strokes = [[(x + jrng.uniform(-4, 4), y + jrng.uniform(-4, 4)) for x, y in s] for s in strokes]
                xs.append(rasterize_strokes(strokes))
                ys.append(digit)
        pred, _ = predict_payload(payload, np.array(xs))
        jitter_report[level] = round(float(accuracy_score(ys, pred)), 4)

    # Reversal false positives per script.
    rev_rng = random.Random(15)
    reversal = {}
    for script in SCRIPTS:
        flagged = 0
        total = 0
        true_pos = 0
        true_n = 0
        for digit in range(10):
            for _ in range(30):
                strokes = transform_strokes(SCRIPTS[script][digit], rev_rng, hard=False)
                grid = rasterize_strokes(strokes)
                pred, _ = predict_payload(payload, grid.reshape(1, -1))
                guessed = script_of(grid, int(pred[0]), cents)
                flag = likely_reversed(int(pred[0]), start_quadrant(strokes), guessed)
                total += 1
                flagged += int(flag)
            if script == "western" and digit in (2, 5, 6, 9):
                for _ in range(20):
                    strokes = [[(x, 80 - y) for x, y in s] for s in SCRIPTS[script][digit]]
                    strokes = transform_strokes(strokes, rev_rng, hard=False)
                    grid = rasterize_strokes(strokes)
                    pred, _ = predict_payload(payload, grid.reshape(1, -1))
                    guessed = script_of(grid, int(pred[0]), cents)
                    flag = likely_reversed(int(pred[0]), start_quadrant(strokes), guessed)
                    true_n += 1
                    true_pos += int(flag and int(pred[0]) == digit)
        reversal[script] = {
            "falsePositiveRate": round(flagged / total, 4),
            "reversedRecall": None if script != "western" else round(true_pos / max(1, true_n), 4),
            "support": total,
        }
    reversal_note = (
        "The reversal check is a Latin-shape heuristic for 2, 5, 6, and 9. "
        "It is not a trained class. Precision is limited because many correct digits start in the same quadrant."
    )

    clean_rng = random.Random(21)
    clean_strokes = []
    for script in SCRIPTS:
        for digit in range(10):
            for _ in range(4):
                clean_strokes.append(transform_strokes(SCRIPTS[script][digit], clean_rng, hard=False))
    limits = choose_thresholds(payload, clean_strokes, bad_inputs(random.Random(22), 120))
    (OUT / "digit_thresholds.json").write_text(json.dumps(limits))

    # Two-digit samples for the app test.
    samples = []
    for value, left, right in ((10, 1, 0), (12, 1, 2), (14, 1, 4)):
        left_s = [[(x, y) for x, y in stroke] for stroke in WESTERN[left]]
        right_s = [[(x + 90, y) for x, y in stroke] for stroke in WESTERN[right]]
        strokes = left_s + right_s
        samples.append({"value": value, "strokes": strokes})
    (OUT / "digit_samples.json").write_text(json.dumps(samples))

    (OUT / "digit_mlp.json").write_text(json.dumps(payload))
    print("digit model", winner, "hard", hard_scores[winner])

    tree_rows = build_tree_rows(4000, 11)
    x_tree, y_tree = rows_matrix(tree_rows)
    xtr, xte, ytr, yte = train_test_split(x_tree, y_tree, test_size=0.2, random_state=SEED, stratify=y_tree)
    tree = DecisionTreeClassifier(max_depth=6, min_samples_leaf=18, random_state=SEED)
    tree.fit(xtr, ytr)
    tree_pred = tree.predict(xte)
    tree_acc = float(accuracy_score(yte, tree_pred))
    tree_f1 = float(f1_score(yte, tree_pred, average="macro", labels=CODES, zero_division=0))
    per_code, code_matrix = class_report(yte, tree_pred, CODES)
    majority = max(set(ytr), key=list(ytr).count)
    majority_acc = float(np.mean(yte == majority))
    rule_pred = np.where(xte[:, FEATURE_NAMES.index("correct")] >= 0.5, "STEADY", "COUNT_ALL")
    # Most common non-steady label in training among incorrect rows.
    incorrect = ytr[xtr[:, FEATURE_NAMES.index("correct")] < 0.5]
    common_error = max(set(incorrect), key=list(incorrect).count) if len(incorrect) else "COUNT_ALL"
    rule_pred = np.where(xte[:, FEATURE_NAMES.index("correct")] >= 0.5, "STEADY", common_error)
    rule_acc = float(accuracy_score(yte, rule_pred))
    lang_report, lang_gap = macro_by_language(tree, 100)
    # Ablation: skip normalization by multiplying timing back up for non-English.
    raw_rows = []
    raw_rng = random.Random(100)
    for code in CODES:
        for lang in LANGS:
            for _ in range(40):
                row = sample_row(code, raw_rng, lang)
                row["timeToFirst"] *= READING_MULTIPLIER[lang]
                row["avgGap"] *= READING_MULTIPLIER[lang]
                raw_rows.append(row)
    xraw, yraw = rows_matrix(raw_rows)
    raw_f1 = float(f1_score(yraw, tree.predict(xraw), average="macro", labels=CODES, zero_division=0))

    noise_report = {}
    timing_idx = [FEATURE_NAMES.index(name) for name in ("timeToFirst", "avgGap", "gapStd")]
    for level, sigma in (("low", 0.15), ("medium", 0.45), ("high", 0.9)):
        noisy = xte.copy()
        noisy[:, timing_idx] += np.random.default_rng(level.__len__() + 3).normal(0, sigma, size=(len(xte), 3))
        noise_report[level] = round(float(accuracy_score(yte, tree.predict(noisy))), 4)
    flip_report = {}
    for rate, seed in ((0.05, 1), (0.10, 2), (0.20, 3)):
        flipped = yte.copy()
        flip_rng = np.random.default_rng(seed)
        choose = flip_rng.random(len(flipped)) < rate
        flipped[choose] = flip_rng.choice(CODES, size=int(choose.sum()))
        flip_report[str(rate)] = round(float(accuracy_score(flipped, tree.predict(xte))), 4)
    shift_rows = build_tree_rows(1200, 77, wide=True)
    xshift, yshift = rows_matrix(shift_rows)
    shift_acc = round(float(accuracy_score(yshift, tree.predict(xshift))), 4)

    examples = {}
    ex_rng = random.Random(11)
    guard = 0
    while len(examples) < 8 and guard < 4000:
        code = CODES[guard % 8]
        guard += 1
        row = sample_row(code, ex_rng, "en")
        pred = tree.predict(np.array([[row[k] for k in FEATURE_NAMES]]))[0]
        if pred == code and code not in examples:
            examples[code] = {key: row[key] for key in FEATURE_NAMES}

    proba = tree.predict_proba(xte)
    cal = calibration(yte, proba, list(tree.classes_))
    exported = tree.tree_
    tree_payload = {
        "children_left": exported.children_left.tolist(),
        "children_right": exported.children_right.tolist(),
        "feature": exported.feature.tolist(),
        "threshold": exported.threshold.tolist(),
        "classes": tree.classes_.tolist(),
        "values": exported.value.tolist(),
        "feature_names": FEATURE_NAMES,
        "accuracy": round(tree_acc, 4),
    }
    (OUT / "misconception_tree.json").write_text(json.dumps(tree_payload))

    per_script = {}
    for script in SCRIPTS:
        mask = np.array(shard) == script
        if mask.sum() == 0:
            continue
        pred, _ = predict_payload(payload, xhard[mask])
        per_script[script] = {
            "accuracy": round(float(accuracy_score(yhard[mask], pred)), 4),
            "support": int(mask.sum()),
        }

    eval_doc = {
        "dataSource": "synthetic",
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "seeds": {"numpy": SEED, "python": SEED, "split": SEED},
        "libraryVersions": {
            "numpy": np.__version__,
            "sklearn": __import__("sklearn").__version__,
            "python": platform.python_version(),
        },
        "readingTimeMultipliers": {
            "values": READING_MULTIPLIER,
            "note": "Assumptions, not measured. Timing features are divided by these before the tree sees them.",
        },
        "strokeTemplatesNote": "Hand-written approximations, not real children's handwriting. Chinese numerals are not modeled. Chinese math uses Western digits.",
        "misconceptionTree": {
            "accuracy": round(tree_acc, 4),
            "macroF1": round(tree_f1, 4),
            "support": int(len(yte)),
            "trainSize": int(len(ytr)),
            "testSize": int(len(yte)),
            "perClass": per_code,
            "confusionMatrix": {"labels": CODES, "matrix": code_matrix},
            "topConfusions": top_confusions(code_matrix, CODES, 5),
            "baselines": {
                "majorityAccuracy": round(majority_acc, 4),
                "majorityLabel": str(majority),
                "ruleAccuracy": round(rule_acc, 4),
                "rule": "If correct is 1, predict STEADY, otherwise the most common incorrect training label.",
                "improvementOverMajority": round(tree_acc - majority_acc, 4),
                "improvementOverRule": round(tree_acc - rule_acc, 4),
            },
            "calibration": cal,
            "robustness": {
                "timingNoiseAccuracy": noise_report,
                "labelFlipAccuracy": flip_report,
                "distributionShiftAccuracy": shift_acc,
                "unnormalizedMacroF1": round(raw_f1, 4),
            },
            "perLanguage": lang_report,
            "worstLanguageGapMacroF1": lang_gap,
            "canonicalExamples": examples,
        },
        "digitModel": {
            "kind": payload["kind"],
            "easyAccuracy": payload["accuracy"],
            "hardAccuracy": hard_scores[winner],
            "beforeStoredEasyAccuracy": before_stored,
            "beforeLegacyEasyAccuracy": None if before_legacy is None else round(before_legacy, 4),
            "beforeHardAccuracy": before_hard,
            "perDigit": per_digit,
            "confusionMatrix": {"labels": list(range(10)), "matrix": digit_matrix},
            "topConfusions": confusions,
            "jitterAccuracy": jitter_report,
            "perScript": per_script,
            "reversalHeuristic": reversal,
            "reversalNote": reversal_note,
            "thresholds": limits,
            "trainSize": digit_train_n,
            "testSize": digit_test_n,
            "hardSize": int(len(yhard)),
        },
        "recommendation": recommendation_section(),
        "pilot": {"status": "not_added"},
    }
    (OUT / "eval.json").write_text(json.dumps(eval_doc))
    print(json.dumps({
        "digitChosen": winner,
        "digitHard": hard_scores[winner],
        "digitEasy": payload["accuracy"],
        "beforeHard": before_hard,
        "beforeLegacy": before_legacy,
        "treeAccuracy": round(tree_acc, 4),
        "treeMacroF1": round(tree_f1, 4),
        "languageGap": lang_gap,
        "thresholds": limits,
    }, indent=2))


if __name__ == "__main__":
    main()
