# Construction-zone polygons: point-in-polygon and distance to boundary.

from __future__ import annotations

import math


# Ray casting; polygon is closed (last vertex to first).
def point_in_polygon(px: float, py: float, poly: list[tuple[float, float]]) -> bool:
    n = len(poly)
    if n < 3:
        return False
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        yi_gt = yi > py
        yj_gt = yj > py
        if yi_gt != yj_gt:
            denom = (yj - yi) or 1e-30
            x_int = (xj - xi) * (py - yi) / denom + xi
            if px < x_int:
                inside = not inside
        j = i
    return inside


def _dist_point_segment(
    px: float, py: float, ax: float, ay: float, bx: float, by: float
) -> float:
    abx = bx - ax
    aby = by - ay
    apx = px - ax
    apy = py - ay
    ab_len2 = abx * abx + aby * aby
    if ab_len2 < 1e-18:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, (apx * abx + apy * aby) / ab_len2))
    qx = ax + abx * t
    qy = ay + aby * t
    return math.hypot(px - qx, py - qy)


def distance_to_polygon_boundary(
    px: float, py: float, poly: list[tuple[float, float]]
) -> float:
    n = len(poly)
    best = float("inf")
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        best = min(best, _dist_point_segment(px, py, x1, y1, x2, y2))
    return best


def point_allowed(
    xi: int,
    yi: int,
    *,
    boundary: list[tuple[int, int]],
    margin: float,
) -> bool:
    poly = [(float(x), float(y)) for x, y in boundary]
    px, py = float(xi), float(yi)
    if not point_in_polygon(px, py, poly):
        return False
    if margin <= 0:
        return True
    return distance_to_polygon_boundary(px, py, poly) >= margin - 1e-9
