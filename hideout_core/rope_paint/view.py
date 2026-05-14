# Camera / view: rotated game-world axes for the rope paint canvas.

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class CameraViewTransform:
    camera_deg: float

    def world_to_view(self, wx: float, wy: float) -> tuple[float, float]:
        t = math.radians(self.camera_deg)
        c, s = math.cos(t), math.sin(t)
        return wx * c - wy * s, wx * s + wy * c

    # Inverse of world_to_view (orthogonal rotation).
    def view_to_world(self, vx: float, vy: float) -> tuple[float, float]:
        t = math.radians(self.camera_deg)
        c, s = math.cos(t), math.sin(t)
        return vx * c + vy * s, -vx * s + vy * c


def polygon_view_vertices(
    boundary_xy: list[tuple[int, int]],
    xf: CameraViewTransform,
) -> list[tuple[float, float]]:
    return [xf.world_to_view(float(x), float(y)) for x, y in boundary_xy]


def zone_view_limits_with_pad(
    boundary_xy: list[tuple[int, int]],
    xf: CameraViewTransform,
    pad_min_xy: tuple[float, float] = (35.0, 35.0),
    pad_frac: float = 0.12,
) -> tuple[float, float, float, float] | None:
    if len(boundary_xy) < 3:
        return None
    verts = polygon_view_vertices(boundary_xy, xf)
    xs = [p[0] for p in verts]
    ys = [p[1] for p in verts]
    pad_x_max = pad_min_xy[0]
    pad_y_max = pad_min_xy[1]
    pad_x = max(pad_x_max, abs(max(xs) - min(xs)) * pad_frac)
    pad_y = max(pad_y_max, abs(max(ys) - min(ys)) * pad_frac)
    return min(xs) - pad_x, max(xs) + pad_x, min(ys) - pad_y, max(ys) + pad_y
