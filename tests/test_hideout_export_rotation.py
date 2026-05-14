from __future__ import annotations

# Export .hideout: r for moss and sand must match the editor scene.

import unittest

from backend.services.export_svc import _meta_shell_for_export
from backend.schemas.scene import SceneModel
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
    def test_export_meta_forces_english_language(self) -> None:
        scene = SceneModel.model_validate(
            {
                "scene_version": 2,
                "camera_deg": 45,
                "boundary": {
                    "points": [
                        {"x": 0, "y": 0},
                        {"x": 10, "y": 0},
                        {"x": 10, "y": 10},
                    ],
                },
                "layers": [
                    {
                        "kind": "default",
                        "visible": True,
                        "locked": False,
                        "batches": [],
                    },
                ],
            },
        )
        meta = _meta_shell_for_export(
            scene,
            {"language": "Russian", "hideout_name": "Test"},
        )
        self.assertEqual(meta["language"], "English")

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
        self.assertEqual(pairs[0][0], "Faridun Ropes")
        self.assertEqual(int(pairs[0][1]["r"]) % ROT_FULL, r_want % ROT_FULL)

    def test_maraketh_line_stroke_r_preserved(self) -> None:
        pairs: list[tuple[str, dict]] = []
        r_want = 4096
        append_painted_batch_as_doodads(
            pairs,
            PaintedBatch(
                template_name_ru="Маракетский щебень 1",
                template_hash=3012657298,
                facet_fv=0,
                line_stroke=True,
                placements=[(7, 8, r_want)],
            ),
            fv=0,
        )
        self.assertEqual(len(pairs), 1)
        self.assertEqual(
            int(pairs[0][1]["r"]) % ROT_FULL,
            r_want % ROT_FULL,
        )

    def test_export_uses_canonical_name_for_drawn_assets(self) -> None:
        pairs: list[tuple[str, dict]] = []
        append_painted_batch_as_doodads(
            pairs,
            PaintedBatch(
                template_name_ru="Куча листьев 3",
                template_hash=4294658310,
                facet_fv=2,
                placements=[(1, 2, 3)],
            ),
            fv=0,
        )
        self.assertEqual(pairs, [
            (
                "Leaf Pile",
                {
                    "hash": 4294658310,
                    "x": 1,
                    "y": 2,
                    "r": 3,
                    "fv": 2,
                },
            ),
        ])

    def test_export_falls_back_to_batch_name_for_unknown_assets(self) -> None:
        pairs: list[tuple[str, dict]] = []
        append_painted_batch_as_doodads(
            pairs,
            PaintedBatch(
                template_name_ru="Свое имя",
                template_hash=999999999,
                facet_fv=7,
                placements=[(5, 6, 7)],
            ),
            fv=1,
        )
        self.assertEqual(pairs[0][0], "Свое имя")
        self.assertEqual(pairs[0][1]["fv"], 7)


if __name__ == "__main__":
    unittest.main()
