# Mathematical utilities for geometric calculations.

from __future__ import annotations

import math

from hideout_core.config.constants import ROT_FULL


# Forward direction along atan2(+Y, +X): uses atan2(dy, dx), quantized to ROT_FULL.
def angle_to_r(dx: float, dy: float) -> int:
    if dx == 0 and dy == 0:
        return 0
    ang = math.atan2(dy, dx)
    q = round(ang / (2.0 * math.pi) * ROT_FULL) % ROT_FULL
    return int(q)


# Unit tangent to the polyline at arc length arc_len along the path.
def tangent_at_distance(
    poly: list[tuple[float, float]], arc_len: float
) -> tuple[float, float]:
    if len(poly) < 2 or arc_len < 0:
        return 1.0, 0.0
    lengths: list[float] = []
    for i in range(len(poly) - 1):
        x1, y1 = poly[i]
        x2, y2 = poly[i + 1]
        lengths.append(math.hypot(x2 - x1, y2 - y1))
    total = sum(lengths)
    if total <= 1e-9:
        return 1.0, 0.0
    s = min(max(0.0, arc_len), total)
    acc = 0.0
    for i, ln in enumerate(lengths):
        if acc + ln >= s - 1e-9:
            frac = (s - acc) / ln if ln > 1e-9 else 0.0
            x1, y1 = poly[i]
            x2, y2 = poly[i + 1]
            dx = x2 - x1
            dy = y2 - y1
            n = math.hypot(dx, dy)
            if n < 1e-9:
                return 1.0, 0.0
            return dx / n, dy / n
        acc += ln
    x1, y1 = poly[-2]
    x2, y2 = poly[-1]
    dx = x2 - x1
    dy = y2 - y1
    n = math.hypot(dx, dy)
    return (dx / n, dy / n) if n > 1e-9 else (1.0, 0.0)


def polyline_total_length(poly: list[tuple[float, float]]) -> float:
    t = 0.0
    for i in range(len(poly) - 1):
        x1, y1 = poly[i]
        x2, y2 = poly[i + 1]
        t += math.hypot(x2 - x1, y2 - y1)
    return t


def interpolate_point_at_distance(
    poly: list[tuple[float, float]], arc_len: float
) -> tuple[float, float]:
    if not poly:
        return 0.0, 0.0
    if len(poly) == 1:
        return poly[0]
    lengths: list[float] = []
    for i in range(len(poly) - 1):
        x1, y1 = poly[i]
        x2, y2 = poly[i + 1]
        lengths.append(math.hypot(x2 - x1, y2 - y1))
    total = sum(lengths)
    if total <= 1e-9:
        return poly[0]
    s = min(max(0.0, arc_len), total)
    acc = 0.0
    for i, ln in enumerate(lengths):
        if acc + ln >= s - 1e-9:
            frac = (s - acc) / ln if ln > 1e-9 else 0.0
            x1, y1 = poly[i]
            x2, y2 = poly[i + 1]
            return x1 + (x2 - x1) * frac, y1 + (y2 - y1) * frac
        acc += ln
    return poly[-1]


# (x, y, r_int) samples every spacing world units along the polyline, including
# start when length > 0 and end when it lands on the spacing grid.
def sample_rope_placement_along_polyline(
    poly: list[tuple[float, float]],
    spacing: float,
) -> list[tuple[int, int, int]]:
    if len(poly) < 2 or spacing <= 0:
        return []
    total = polyline_total_length(poly)
    if total < 1e-9:
        return []
    out: list[tuple[int, int, int]] = []
    s = 0.0
    while s <= total + spacing * 0.5:
        if s <= total + 1e-6:
            px, py = interpolate_point_at_distance(poly, min(s, total))
            tx, ty = tangent_at_distance(poly, min(s, total))
            r = angle_to_r(tx, ty)
            xi = int(round(px))
            yi = int(round(py))
            if not out or (out[-1][0], out[-1][1]) != (xi, yi):
                out.append((xi, yi, r))
        s += spacing
    return out
