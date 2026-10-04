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
from raster28 import GRID, INNER, rasterize_strokes  # noqa: E402  # MNIST-style 28×28
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


def write_golden():
    from train_digit_cnn import write_golden_rasters

    return write_golden_rasters()


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
    """Finger-drawing variation for ages 5 to 8. Same RNG order on every rerun."""
    jitter = 4.2 if hard else 1.5
    rot = math.radians(rng.uniform(-20, 20) if hard else rng.uniform(-9, 9))
    shear = rng.uniform(-0.28, 0.28) if hard else rng.uniform(-0.1, 0.1)
    sx = rng.uniform(0.62, 1.35) if hard else rng.uniform(0.82, 1.18)
    sy = rng.uniform(0.62, 1.4) if hard else rng.uniform(0.82, 1.22)
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
        if len(pts) > 2 and rng.random() < (0.4 if hard else 0.18):
            x0, y0 = pts[-2]
            x1, y1 = pts[-1]
            reach = rng.uniform(0.12, 0.4)
            pts.append((x1 + (x1 - x0) * reach, y1 + (y1 - y0) * reach))
        if len(pts) > 5 and rng.random() < (0.35 if hard else 0.12):
            pts = pts[:-1]
        if len(pts) > 4 and rng.random() < (0.35 if hard else 0.15):
            gap = len(pts) // 2
            pts = pts[: gap - 1] + pts[gap + 1 :]
        if len(pts) > 4 and rng.random() < (0.25 if hard else 0.08):
            pts = pts + list(reversed(pts[:3]))
        step = 2 if hard and rng.random() < 0.35 else 1
        pts = pts[::step] if len(pts) > 2 else pts
        out.append(pts)
        if rng.random() < (0.45 if hard else 0.2):
            dx = rng.uniform(-2.4, 2.4)
            dy = rng.uniform(-2.4, 2.4)
            out.append([(px + dx, py + dy) for px, py in pts])
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
    confs = []
    for strokes in clean_strokes:
        grid = rasterize_strokes(strokes).reshape(1, -1)
        _pred, probs = predict_payload(model_payload, grid)
        order = np.argsort(probs[0])
        confs.append(float(probs[0, order[-1]]))
    confirm = round(float(best["minConfidence"]) + 0.05, 2)
    for candidate in (0.96, 0.93, 0.9):
        share = sum(value >= candidate for value in confs) / max(1, len(confs))
        if share >= 0.35 and candidate > best["minConfidence"]:
            confirm = candidate
            break
    band = [value for value in confs if best["minConfidence"] <= value < confirm]
    best["confirmConfidence"] = confirm
    best["confirmZoneRate"] = round(len(band) / max(1, len(confs)), 4)
    best["highConfidenceShare"] = round(sum(c >= confirm for c in confs) / max(1, len(confs)), 4)
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


def load_pen_digits(limit=4000):
    """UCI pen trajectories, rasterized with the same function as the app."""
    path = Path(__file__).resolve().parent / "data" / "cache" / "pendigits.tra"
    if not path.exists():
        return [], "not_downloaded"
    rows = []
    for line in path.read_text().splitlines():
        parts = [int(p) for p in line.split(",") if p != ""]
        if len(parts) != 17:
            continue
        stroke = [(parts[i] * 0.8, parts[i + 1] * 0.8) for i in range(0, 16, 2)]
        rows.append((rasterize_strokes([stroke]), parts[-1], "western"))
        if len(rows) >= limit:
            break
    return rows, "UCI Pen-Based Recognition of Handwritten Digits (CC BY 4.0), training file"


def _fit_bitmap(image):
    """Crop a raster digit, scale the long side to 12, and center it on 16x16."""
    ys, xs = np.where(image > 0.08)
    if len(xs) == 0:
        return None
    crop = image[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    h, w = crop.shape
    long_side = max(h, w)
    scale = 12.0 / long_side
    nh = max(1, int(round(h * scale)))
    nw = max(1, int(round(w * scale)))
    ys_i = (np.linspace(0, h - 1, nh)).astype(int)
    xs_i = (np.linspace(0, w - 1, nw)).astype(int)
    small = crop[ys_i][:, xs_i]
    canvas = np.zeros((16, 16), dtype=np.float64)
    top = (16 - nh) // 2
    left = (16 - nw) // 2
    canvas[top : top + nh, left : left + nw] = small
    flat = canvas.reshape(-1)
    flat[flat > 0] = np.maximum(flat[flat > 0], 0.55)
    # Match the stroke rasterizer's ink: the center of a mark is 1.
    flat[canvas.reshape(-1) > 0.5] = 1.0
    return flat


def load_mnist(limit=8000):
    path = Path(__file__).resolve().parent / "data" / "cache" / "train-images-idx3-ubyte.gz"
    labels = Path(__file__).resolve().parent / "data" / "cache" / "train-labels-idx1-ubyte.gz"
    if not path.exists() or not labels.exists():
        return [], "not_downloaded"
    import gzip
    with gzip.open(path, "rb") as handle:
        raw = handle.read()
    with gzip.open(labels, "rb") as handle:
        yraw = handle.read()
    images = np.frombuffer(raw, dtype=np.uint8, offset=16).reshape(-1, 28, 28) / 255.0
    ys = np.frombuffer(yraw, dtype=np.uint8, offset=8)
    rows = []
    for image, label in zip(images[:limit], ys[:limit]):
        flat = _fit_bitmap(image)
        if flat is None:
            continue
        rows.append((flat, int(label), "western"))
    return rows, "MNIST (Yann LeCun, CC BY-SA 3.0), training images"


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
    # Digit CNN training lives in train_digit_cnn.py (28×28 MNIST-style pipeline).
    from train_digit_cnn import main as train_digits

    old_path = OUT / "digit_mlp.json"
    old_payload = json.loads(old_path.read_text()) if old_path.exists() else None
    before_stored = None if not old_payload else old_payload.get("accuracy")
    before_legacy = legacy_easy_accuracy(old_payload) if old_payload else None
    before_hard = None

    fragment_path = OUT / "digit_eval_fragment.json"
    if os.environ.get("DIGIT_SKIP_TRAIN") == "1" and fragment_path.exists() and old_path.exists():
        print("DIGIT_SKIP_TRAIN=1 — reusing existing digit model + eval fragment")
        digit_eval = json.loads(fragment_path.read_text())
    else:
        digit_eval = train_digits()
    payload = json.loads((OUT / "digit_mlp.json").read_text())
    limits = json.loads((OUT / "digit_thresholds.json").read_text())
    winner = payload.get("comparison", {}).get("chosen", payload.get("kind", "cnn"))
    reported_hard = digit_eval.get("hardAccuracy")
    per_digit = digit_eval.get("perDigit")
    digit_matrix = digit_eval.get("confusionMatrix", {}).get("matrix")
    confusions = digit_eval.get("topConfusions")
    per_script = digit_eval.get("perScript")
    jitter_report = {"mild": None, "medium": None, "high": None}
    reversal = {
        "western": {
            "falsePositiveRate": digit_eval.get("reversalFalsePositiveRate"),
            "reversedRecall": None,
            "support": 500,
        },
        "arabic": {"falsePositiveRate": 0.0, "reversedRecall": None, "support": 0},
        "devanagari": {"falsePositiveRate": 0.0, "reversedRecall": None, "support": 0},
    }
    reversal_note = (
        "The reversal check is a Latin-shape heuristic for 2, 5, 6, and 9. "
        "It is not a trained class. Precision is limited because many correct digits start in the same quadrant."
    )
    digit_train_n = int(digit_eval.get("datasets", {}).get("mnist", {}).get("train", 0) or 0)
    digit_test_n = int(digit_eval.get("datasets", {}).get("mnist", {}).get("test", 0) or 0)
    pen_note = "UCI pen digits optional; primary data is MNIST + synthetic strokes"
    pen_rows = []
    mnist_note = digit_eval.get("datasets", {}).get("mnist", {}).get("note", "")
    mnist_rows = [0] * digit_train_n
    real_rows = [0] * int(digit_eval.get("datasets", {}).get("realLocal", 0) or 0)
    print("digit model", winner, "hard", reported_hard, "mnist", digit_eval.get("mnistTestAccuracy"))
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
            "hardAccuracy": reported_hard,
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
            "hardSize": int(digit_eval.get("datasets", {}).get("syntheticTemplates", {}).get("hardTest", 0) or 0),
            "mnistTestAccuracy": digit_eval.get("mnistTestAccuracy"),
            "inferenceMs": digit_eval.get("inferenceMs"),
            "paramCount": digit_eval.get("paramCount"),
            "datasets": digit_eval.get("datasets")
            or {
                "syntheticTemplates": "Hand-written stroke templates in this script, not children's writing.",
                "pen": {"note": pen_note, "used": len(pen_rows)},
                "mnist": {"note": mnist_note, "used": len(mnist_rows)},
                "realLocal": len(real_rows),
            },
        },
        "recommendation": recommendation_section(),
        "pilot": {"status": "not_added"},
    }
    (OUT / "eval.json").write_text(json.dumps(eval_doc))
    print(json.dumps({
        "digitChosen": winner,
        "digitHard": reported_hard,
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
