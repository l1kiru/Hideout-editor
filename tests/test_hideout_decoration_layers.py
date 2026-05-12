from __future__ import annotations

# Splitting decorations for .hideout import (palette vs others).

import unittest

from hideout_core.config.constants import (
    FLYING_SAND_HASH,
    MOSS_EDGE_3_HASH,
    ROPE_TEMPLATE_HASH,
)
from backend.services.hideout_decoration_layers import (
    is_editor_palette_exact_doodad,
    split_decoration_pairs_for_hideout_import,
)


class TestHideoutDecorationLayers(unittest.TestCase):
    def test_palette_exact_hash_fv(self) -> None:
        self.assertTrue(
            is_editor_palette_exact_doodad(
                {"hash": ROPE_TEMPLATE_HASH, "fv": 3, "x": 0, "y": 0, "r": 0},
            ),
        )
        self.assertTrue(
            is_editor_palette_exact_doodad(
                {"hash": MOSS_EDGE_3_HASH, "fv": 2, "x": 0, "y": 0, "r": 0},
            ),
        )
        self.assertTrue(
            is_editor_palette_exact_doodad(
                {"hash": FLYING_SAND_HASH, "fv": 0, "x": 0, "y": 0, "r": 0},
            ),
        )

    def test_palette_wrong_fv_not_exact(self) -> None:
        self.assertFalse(
            is_editor_palette_exact_doodad(
                {"hash": ROPE_TEMPLATE_HASH, "fv": 5, "x": 0, "y": 0, "r": 0},
            ),
        )

    def test_split_only_when_both_kinds(self) -> None:
        rope = (
            "Фаридунские верёвки",
            {"hash": ROPE_TEMPLATE_HASH, "x": 0, "y": 0, "r": 0, "fv": 3},
        )
        tree = ("Дерево", {"hash": 99999999, "x": 0, "y": 0, "r": 0, "fv": 0})
        o, e, split = split_decoration_pairs_for_hideout_import([rope, tree])
        self.assertTrue(split)
        self.assertEqual(len(o), 1)
        self.assertEqual(len(e), 1)
        self.assertEqual(o[0][0], "Дерево")

    def test_all_palette_no_split(self) -> None:
        rope = (
            "Фаридунские верёвки",
            {"hash": ROPE_TEMPLATE_HASH, "x": 0, "y": 0, "r": 0, "fv": 3},
        )
        sand = (
            "Летающий песок",
            {"hash": FLYING_SAND_HASH, "x": 0, "y": 0, "r": 0, "fv": 0},
        )
        o, e, split = split_decoration_pairs_for_hideout_import([rope, sand])
        self.assertFalse(split)
        self.assertEqual(len(o), 2)
        self.assertEqual(e, [])

    def test_all_other_no_split(self) -> None:
        pairs = [
            ("А", {"hash": 1, "x": 0, "y": 0, "r": 0, "fv": 0}),
            ("Б", {"hash": 2, "x": 0, "y": 0, "r": 0, "fv": 1}),
        ]
        o, e, split = split_decoration_pairs_for_hideout_import(pairs)
        self.assertFalse(split)
        self.assertEqual(o, pairs)
        self.assertEqual(e, [])


if __name__ == "__main__":
    unittest.main()
