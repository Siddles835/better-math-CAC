"""MNIST-style 28×28 stroke rasterizer. Must match src/lib/cognition/strokes.ts."""
from __future__ import annotations

import math

GRID = 28
INNER = 20  # ink fits in 20×20 before CoM centering into 28×28
THICKNESS = 3.0


def clamp(n, lo, hi):
    return max(lo, min(hi, n))


def dist_to_segment(px, py, x0, y0, x1, y1):
    dx = x1 - x0
    dy = y1 - y0
    len2 = dx * dx + dy * dy
    if len2 < 1e-8:
        return math.hypot(px - x0, py - y0)
    t = ((px - x0) * dx + (py - y0) * dy) / len2
    t = clamp(t, 0.0, 1.0)
    return math.hypot(px - (x0 + t * dx), py - (y0 + t * dy))


def paint_segment(grid, x0, y0, x1, y1, thickness=THICKNESS):
    pad = thickness + 1.5
    min_x = max(0, int(math.floor(min(x0, x1) - pad)))
    max_x = min(GRID - 1, int(math.ceil(max(x0, x1) + pad)))
    min_y = max(0, int(math.floor(min(y0, y1) - pad)))
    max_y = min(GRID - 1, int(math.ceil(max(y0, y1) + pad)))
    half = thickness / 2
    for y in range(min_y, max_y + 1):
        for x in range(min_x, max_x + 1):
            dist = dist_to_segment(x + 0.5, y + 0.5, x0, y0, x1, y1)
            ink = clamp(half + 0.55 - dist, 0.0, 1.0)
            if ink <= 0:
                continue
            idx = y * GRID + x
            if ink > grid[idx]:
                grid[idx] = ink


def rasterize_strokes(strokes):
    """Return a length-784 list of floats in [0, 1]."""
    grid = [0.0] * (GRID * GRID)
    pts = [p for stroke in strokes for p in stroke]
    if not pts:
        return grid
    min_x = min(p[0] for p in pts)
    min_y = min(p[1] for p in pts)
    max_x = max(p[0] for p in pts)
    max_y = max(p[1] for p in pts)
    w = max(1.0, max_x - min_x)
    h = max(1.0, max_y - min_y)
    scale = (INNER - 1) / max(w, h)
    scaled_w = w * scale
    scaled_h = h * scale
    pad_x = (INNER - scaled_w) / 2
    pad_y = (INNER - scaled_h) / 2
    origin_x = (GRID - INNER) / 2 + pad_x
    origin_y = (GRID - INNER) / 2 + pad_y

    def map_x(x):
        return (x - min_x) * scale + origin_x

    def map_y(y):
        return (y - min_y) * scale + origin_y

    for stroke in strokes:
        if not stroke:
            continue
        if len(stroke) == 1:
            x = map_x(stroke[0][0])
            y = map_y(stroke[0][1])
            paint_segment(grid, x, y, x + 0.01, y + 0.01)
            continue
        for i in range(1, len(stroke)):
            paint_segment(
                grid,
                map_x(stroke[i - 1][0]),
                map_y(stroke[i - 1][1]),
                map_x(stroke[i][0]),
                map_y(stroke[i][1]),
            )

    mass = 0.0
    sum_x = 0.0
    sum_y = 0.0
    for y in range(GRID):
        for x in range(GRID):
            v = grid[y * GRID + x]
            if v <= 0:
                continue
            mass += v
            sum_x += v * (x + 0.5)
            sum_y += v * (y + 0.5)
    if mass < 1e-6:
        return grid
    cx = sum_x / mass
    cy = sum_y / mass
    shift_x = int(round(GRID / 2 - cx))
    shift_y = int(round(GRID / 2 - cy))
    if shift_x == 0 and shift_y == 0:
        return grid
    shifted = [0.0] * (GRID * GRID)
    for y in range(GRID):
        for x in range(GRID):
            sx = x - shift_x
            sy = y - shift_y
            if sx < 0 or sy < 0 or sx >= GRID or sy >= GRID:
                continue
            shifted[y * GRID + x] = grid[sy * GRID + sx]
    return shifted
