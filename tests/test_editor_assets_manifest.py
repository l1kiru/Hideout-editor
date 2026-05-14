from __future__ import annotations

import unittest

from backend.schemas.scene import SceneModel, build_editor_scene_contract_artifact
from hideout_core.config.editor_assets import (
    asset_key_for_template,
    drawing_asset_keys,
    export_fv_for_batch,
    export_name_for_batch,
    is_palette_exact_hash_fv,
    load_editor_assets_manifest,
)


class TestEditorAssetsManifest(unittest.TestCase):
    def test_scene_contract_artifact_tracks_backend_contract_and_legacy_variants(self) -> None:
        contract = build_editor_scene_contract_artifact()
        self.assertEqual(contract["sceneVersion"], 2)
        self.assertIn("faridun_ropes4", contract["toolVariants"])
        self.assertNotIn("rope", contract["toolVariants"])
        self.assertIn("rope", contract["acceptedToolVariants"])

    def test_asset_key_lookup_uses_hash_plus_fv_before_hash_only_fallback(self) -> None:
        self.assertEqual(asset_key_for_template(1675705915, 3), "faridun_ropes4")
        self.assertEqual(asset_key_for_template(1675705915, 0), "faridun_ropes1")
        self.assertEqual(asset_key_for_template(1675705915, None), "faridun_ropes4")
        self.assertIsNone(asset_key_for_template(999999999, None))

    def test_palette_exact_and_export_fv_semantics_come_from_manifest(self) -> None:
        self.assertTrue(is_palette_exact_hash_fv(1675705915, 3))
        self.assertTrue(is_palette_exact_hash_fv(1459723677, 2))
        self.assertTrue(is_palette_exact_hash_fv(3853073345, 0))
        self.assertFalse(is_palette_exact_hash_fv(3012657298, 0))
        self.assertEqual(export_name_for_batch(1675705915, 3), "Faridun Ropes")
        self.assertEqual(export_name_for_batch(1675705915, 0), "Faridun Ropes")
        self.assertEqual(export_name_for_batch(1459723677, 2), "Fringe Moss")
        self.assertEqual(export_name_for_batch(2233574719, 4), "Faridun Tools")
        self.assertIsNone(export_name_for_batch(999999999, None))

        self.assertEqual(
            export_fv_for_batch(1675705915, batch_facet_fv=None, scene_tool_fv=7),
            7,
        )
        self.assertEqual(
            export_fv_for_batch(1675705915, batch_facet_fv=0, scene_tool_fv=7),
            0,
        )
        self.assertEqual(
            export_fv_for_batch(1459723677, batch_facet_fv=None, scene_tool_fv=7),
            2,
        )
        self.assertEqual(
            export_fv_for_batch(3853073345, batch_facet_fv=None, scene_tool_fv=7),
            0,
        )
        self.assertEqual(
            export_fv_for_batch(2233574719, batch_facet_fv=None, scene_tool_fv=7),
            0,
        )

    def test_drawing_asset_keys_follow_manifest_order(self) -> None:
        self.assertEqual(
            drawing_asset_keys(),
            (
                "faridun_ropes4",
                "faridun_ropes1",
                "moss",
                "sand",
                "maraketh_rubble1",
                "faridun_tools5",
                "leaf_pile3",
            ),
        )

    def test_backend_default_tool_comes_from_manifest_runtime_defaults(self) -> None:
        manifest = load_editor_assets_manifest()
        tool_asset_key = str(manifest["toolFvAssetKey"])
        tool_asset = manifest["assets"][tool_asset_key]
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
        self.assertEqual(scene.tool.variant, tool_asset_key)
        self.assertEqual(scene.tool.fv, int(tool_asset["defaultFv"]))


if __name__ == "__main__":
    unittest.main()
