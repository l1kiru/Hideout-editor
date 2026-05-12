from __future__ import annotations

# Export .hideout: r for moss and sand must match the editor scene.

import unittest

from hideout_core.config.constants import (
    FLYING_SAND_HASH,
    FLYING_SAND_NAME_RU,
    MOSS_EDGE_3_HASH,
    MOSS_EDGE_3_NAME_RU,
    ROT_FULL,
    ROPE_TEMPLATE_HASH,
    ROPE_TEMPLATE_NAME_RU,
)
from hideout_core.rope_paint.export import append_painted_batch_as_doodads
from hideout_core.rope_paint.paint_data import PaintedBatch


class TestHideoutExportRotation(unittest.TestCase):
    def test_moss_sand_r_preserved(self) -> None:
        for th, name in (
            (MOSS_EDGE_3_HASH, MOSS_EDGE_3_NAME_RU),
            (FLYING_SAND_HASH, FLYING_SAND_NAME_RU),
        ):
            with self.subTest(hash=th):
                pairs: list[tuple[str, dict]] = []
                r_want = 4096
                append_painted_batch_as_doodads(
                    pairs,
                    PaintedBatch(
                        template_name_ru=name,
                        template_hash=th,
                        placements=[(10, 20, r_want)],
                    ),
                    fv=3,
                )
                self.assertEqual(len(pairs), 1)
                self.assertEqual(int(pairs[0][1]["r"]) % ROT_FULL, r_want % ROT_FULL)

    def test_rope_r_preserved(self) -> None:
        pairs: list[tuple[str, dict]] = []
        r_want = 8192
        append_painted_batch_as_doodads(
            pairs,
            PaintedBatch(
                template_name_ru=ROPE_TEMPLATE_NAME_RU,
                template_hash=ROPE_TEMPLATE_HASH,
                placements=[(1, 2, r_want)],
            ),
            fv=3,
        )
        self.assertEqual(len(pairs), 1)
        self.assertEqual(int(pairs[0][1]["r"]) % ROT_FULL, r_want % ROT_FULL)


if __name__ == "__main__":
    unittest.main()
