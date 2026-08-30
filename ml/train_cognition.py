"""Train on-device MathLift cognition models and export JSON for the React app."""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

import numpy as np
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.tree import DecisionTreeClassifier

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "lib" / "cognition" / "models"
OUT.mkdir(parents=True, exist_ok=True)

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

GRID = 16
INNER = 12


def clamp(n, lo, hi):
    return max(lo, min(hi, n))


def paint_line(grid, x0, y0, x1, y1):
    steps = max(1, int(math.hypot(x1 - x0, y1 - y0) * 3))
    for s in range(steps + 1):
        x = x0 + (x1 - x0) * s / steps
        y = y0 + (y1 - y0) * s / steps
        gx = clamp(int(round(x)), 0, GRID - 1)
        gy = clamp(int(round(y)), 0, GRID - 1)
        grid[gy, gx] = 1.0
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = gx + dx, gy + dy
            if 0 <= nx < GRID and 0 <= ny < GRID:
                grid[ny, nx] = max(grid[ny, nx], 0.55)


DIGIT_PATHS = {
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


def jitter_path(path, rng):
    out = []
    for x, y in path:
        out.append((x + rng.uniform(-0.8, 0.8), y + rng.uniform(-0.8, 0.8)))
    return out


def render_digit(digit: int, rng: random.Random, reverse=False) -> np.ndarray:
    grid = np.zeros((GRID, GRID), dtype=np.float32)
    path = jitter_path(DIGIT_PATHS[digit], rng)
    if reverse:
        path = [(x, GRID - 1 - y) for x, y in path]
    ox = rng.uniform(-0.6, 0.6)
    oy = rng.uniform(-0.6, 0.6)
    for i in range(1, len(path)):
        x0, y0 = path[i - 1]
        x1, y1 = path[i]
        paint_line(grid, x0 + ox, y0 + oy, x1 + ox, y1 + oy)
    if rng.random() < 0.25:
        grid += rng.uniform(0, 0.12)
        grid = np.clip(grid, 0, 1)
    return grid


def train_digit_mlp():
    rng = random.Random(7)
    X, y = [], []
    for digit in range(10):
        for _ in range(180):
            X.append(render_digit(digit, rng).reshape(-1))
            y.append(digit)
        if digit in (2, 5, 6, 9):
            for _ in range(40):
                X.append(render_digit(digit, rng, reverse=True).reshape(-1))
                y.append(digit)
    X = np.array(X)
    y = np.array(y)
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    model = MLPClassifier(
        hidden_layer_sizes=(48,),
        activation="relu",
        max_iter=120,
        random_state=42,
        alpha=0.001,
    )
    model.fit(Xtr, ytr)
    acc = accuracy_score(yte, model.predict(Xte))
    payload = {
        "sizes": [256, 48, 10],
        "activation": "relu",
        "classes": [int(c) for c in model.classes_],
        "coefs": [c.tolist() for c in model.coefs_],
        "intercepts": [b.tolist() for b in model.intercepts_],
        "accuracy": round(float(acc), 4),
    }
    (OUT / "digit_mlp.json").write_text(json.dumps(payload))
    print(f"Digit MLP accuracy: {acc:.3f}")
    return acc


def sample_row(code: str, rng: random.Random) -> dict:
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
        row.update(drawReversal=1, drawMatch=0, drawConfidence=rng.uniform(0.45, 0.85), planetIndex=rng.choice([1, 3]))
    elif code == "WORD_GAP":
        row.update(
            drawMatch=0,
            correct=0,
            timeToFirst=rng.uniform(4, 14),
            lessonCode=1,
            planetIndex=5,
        )
    elif code == "PLACE_SPLIT":
        row.update(planetIndex=rng.choice([5, 6]), lessonCode=rng.choice([1, 2]), undershoot=rng.randint(1, 3), correct=0)
    else:
        row.update(correct=1, overshoot=0, undershoot=0, retries=0, equationSwap=0, drawReversal=0)
    return row


def train_misconception_tree():
    rng = random.Random(11)
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
    for _ in range(4000):
        code = rng.choices(list(weights), weights=list(weights.values()))[0]
        rows.append(sample_row(code, rng))

    feature_names = [
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
    X = np.array([[r[k] for k in feature_names] for r in rows], dtype=float)
    y = np.array([r["label"] for r in rows])
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    model = DecisionTreeClassifier(max_depth=6, min_samples_leaf=18, random_state=42)
    model.fit(Xtr, ytr)
    acc = accuracy_score(yte, model.predict(Xte))
    tree = model.tree_
    payload = {
        "children_left": tree.children_left.tolist(),
        "children_right": tree.children_right.tolist(),
        "feature": tree.feature.tolist(),
        "threshold": tree.threshold.tolist(),
        "classes": model.classes_.tolist(),
        "values": tree.value.tolist(),
        "feature_names": feature_names,
        "accuracy": round(float(acc), 4),
    }
    (OUT / "misconception_tree.json").write_text(json.dumps(payload))
    print(f"Misconception tree accuracy: {acc:.3f}")
    return acc


if __name__ == "__main__":
    digit_acc = train_digit_mlp()
    tree_acc = train_misconception_tree()
    print(json.dumps({"digit": digit_acc, "misconception": tree_acc}))
