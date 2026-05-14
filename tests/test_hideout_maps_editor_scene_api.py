from __future__ import annotations

import json
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path

import backend.database as database
from fastapi.testclient import TestClient

from backend.main import app
from backend.schemas.scene import SceneModel
from backend.services.maps_repo import (
    create_new_map,
    get_editor_scene_json,
    get_map_template_hideout_json,
    init_db,
    promote_map_to_base,
    save_boundary_order,
)
from hideout_core.config.settings import settings


def minimal_scene_body() -> dict:
    fixture_path = Path(__file__).resolve().parent / "fixtures" / "editor_scene_v2_minimal.json"
    return json.loads(fixture_path.read_text(encoding="utf-8"))


class TestHideoutMapsEditorSceneApi(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        database.MAPS_SQLITE_PATH = Path(self._tmpdir.name) / "hideout_maps_test.sqlite"
        self._prev_max_bytes = settings.max_editor_scene_json_bytes

    def tearDown(self) -> None:
        settings.max_editor_scene_json_bytes = self._prev_max_bytes
        try:
            self._tmpdir.cleanup()
        except OSError:
            pass

    def _create_user_map(self, name: str = "scene-api-map") -> int:
        init_db()
        return int(create_new_map(name)["id"])

    def test_put_editor_scene_saves_canonical_json(self) -> None:
        map_id = self._create_user_map()
        body = minimal_scene_body()
        body["ui"] = None
        body["unknown_field"] = {"ignored": True}

        with TestClient(app) as client:
            response = client.put(f"/api/maps/{map_id}/editor-scene", json=body)
            self.assertEqual(response.status_code, 204)

            saved = client.get(f"/api/maps/{map_id}/editor-scene")
            self.assertEqual(saved.status_code, 200)
            doc = saved.json()

        self.assertNotIn("unknown_field", doc)
        self.assertNotIn("ui", doc)
        self.assertIn("background", doc)
        self.assertIn("tool", doc)

        raw = get_editor_scene_json(map_id)
        self.assertIsNotNone(raw)
        assert raw is not None
        self.assertNotIn("unknown_field", raw)
        self.assertNotIn('"ui"', raw)

    def test_put_editor_scene_rejects_invalid_payload(self) -> None:
        map_id = self._create_user_map("scene-api-invalid")

        with TestClient(app) as client:
            response = client.put(
                f"/api/maps/{map_id}/editor-scene",
                json={"layers": []},
            )

        self.assertEqual(response.status_code, 400)
        payload = response.json()["detail"]
        self.assertEqual(payload["error"]["code"], "maps.invalid_request")

    def test_put_editor_scene_rejects_incompatible_scene_version(self) -> None:
        map_id = self._create_user_map("scene-api-version")
        body = minimal_scene_body()
        body["scene_version"] = 999

        with TestClient(app) as client:
            response = client.put(f"/api/maps/{map_id}/editor-scene", json=body)

        self.assertEqual(response.status_code, 400)
        payload = response.json()["detail"]
        self.assertEqual(payload["error"]["code"], "maps.invalid_request")

    def test_put_editor_scene_rejects_empty_layers(self) -> None:
        map_id = self._create_user_map("scene-api-empty-layers")
        body = minimal_scene_body()
        body["layers"] = []

        with TestClient(app) as client:
            response = client.put(f"/api/maps/{map_id}/editor-scene", json=body)

        self.assertEqual(response.status_code, 400)
        payload = response.json()["detail"]
        self.assertEqual(payload["error"]["code"], "maps.invalid_request")

    def test_put_editor_scene_rejects_out_of_range_placements(self) -> None:
        map_id = self._create_user_map("scene-api-placement-range")
        base_body = minimal_scene_body()
        base_body["layers"][0]["batches"] = [
            {
                "template_name_ru": "Test",
                "template_hash": 1,
                "placements": [{"x": 0, "y": 0, "r": 0}],
            },
        ]

        for field, value in (
            ("x", 1_000_001),
            ("y", -1_000_001),
            ("r", 360_001),
        ):
            with self.subTest(field=field):
                body = deepcopy(base_body)
                body["layers"][0]["batches"][0]["placements"][0][field] = value
                with TestClient(app) as client:
                    response = client.put(
                        f"/api/maps/{map_id}/editor-scene",
                        json=body,
                    )

                self.assertEqual(response.status_code, 400)
                payload = response.json()["detail"]
                self.assertEqual(payload["error"]["code"], "maps.invalid_request")

    def test_put_editor_scene_rejects_base_map(self) -> None:
        map_id = self._create_user_map("scene-api-base-map")
        promote_map_to_base(
            map_id,
            export_hideout_display_name="Scene API Base",
            export_hideout_hash=123,
        )

        with TestClient(app) as client:
            response = client.put(
                f"/api/maps/{map_id}/editor-scene",
                json=minimal_scene_body(),
            )

        self.assertEqual(response.status_code, 400)
        payload = response.json()["detail"]
        self.assertEqual(payload["error"]["code"], "maps.invalid_request")

    def test_tool_model_allows_forward_compatible_fields(self) -> None:
        map_id = self._create_user_map("scene-api-tool-extra")
        body = minimal_scene_body()
        body["tool"]["future_option"] = {"enabled": True}

        with TestClient(app) as client:
            response = client.put(f"/api/maps/{map_id}/editor-scene", json=body)
            self.assertEqual(response.status_code, 204)

            saved = client.get(f"/api/maps/{map_id}/editor-scene")
            self.assertEqual(saved.status_code, 200)
            doc = saved.json()

        self.assertEqual(doc["tool"]["future_option"], {"enabled": True})

    def test_shared_minimal_scene_fixture_validates_with_backend_schema(self) -> None:
        scene = SceneModel.model_validate(minimal_scene_body())
        self.assertEqual(scene.scene_version, 2)
        self.assertEqual(scene.tool.variant, "select")

    def test_map_template_routes_use_stable_map_template_storage(self) -> None:
        map_id = self._create_user_map("scene-api-template")
        save_boundary_order(
            map_id,
            {"points": [{"x": 0, "y": 0}, {"x": 10, "y": 0}, {"x": 10, "y": 10}]},
            template_hideout_json=json.dumps(
                {
                    "meta_shell": {"hideout_name": "Runtime Template"},
                    "doodads_pairs": [
                        ["Тайник", {"hash": 1, "x": 0, "y": 0, "r": 0}],
                        ["Тайник", {"hash": 1, "x": 1, "y": 1, "r": 0}],
                        ["Дерево", {"hash": 2, "x": 2, "y": 2, "r": 0}],
                    ],
                },
                ensure_ascii=False,
            ),
        )

        with TestClient(app) as client:
            names_response = client.get(f"/api/maps/{map_id}/layer0-doodad-names")
            self.assertEqual(names_response.status_code, 200)
            self.assertEqual(names_response.json(), ["Тайник", "Дерево"])

            template_response = client.post(f"/api/maps/{map_id}/load-template")
            self.assertEqual(template_response.status_code, 200)
            payload = template_response.json()

        self.assertEqual(payload["template_id"], f"map_tpl_{map_id}")
        self.assertEqual(payload["hideout_name"], "Runtime Template")
        self.assertEqual(payload["doodads_kept_count"], 3)

    def test_publish_hideout_map_accepts_uploaded_hideout_metadata(self) -> None:
        init_db()
        payload = {
            "map_display_name": "boundary-uploaded-hideout",
            "points": [
                {"x": 0, "y": 0},
                {"x": 10, "y": 0},
                {"x": 10, "y": 10},
            ],
            "source_hideout": "HideoutCanal.hideout",
            "hideout_hash": 123456,
            "placements": [
                {
                    "seq": 1,
                    "name": "Tree",
                    "hash": 101,
                    "x": 1,
                    "y": 2,
                    "r": 0,
                    "fv": 0,
                },
                {
                    "seq": 2,
                    "name": "Rock",
                    "hash": 202,
                    "x": 3,
                    "y": 4,
                    "r": 90,
                    "fv": 1,
                },
            ],
        }

        with TestClient(app) as client:
            response = client.post("/api/boundary/publish-hideout-map", json=payload)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["written"])
        map_id = int(body["map_id"])
        template_raw = get_map_template_hideout_json(map_id)
        self.assertIsNotNone(template_raw)
        assert template_raw is not None
        template_doc = json.loads(template_raw)
        self.assertEqual(
            template_doc["meta_shell"]["hideout_name"],
            "HideoutCanal.hideout",
        )
        self.assertEqual(template_doc["meta_shell"]["hideout_hash"], 123456)
        self.assertEqual(len(template_doc["doodads_pairs"]), 2)

    def test_put_editor_scene_size_limit_uses_canonical_json(self) -> None:
        map_id = self._create_user_map("scene-api-size")
        body = minimal_scene_body()
        body["unknown_field"] = "x" * 5000

        canonical_bytes = len(
            SceneModel.model_validate(minimal_scene_body())
            .model_dump_json(exclude_none=True)
            .encode("utf-8"),
        )
        settings.max_editor_scene_json_bytes = canonical_bytes + 16

        with TestClient(app) as client:
            response = client.put(f"/api/maps/{map_id}/editor-scene", json=body)

        self.assertEqual(response.status_code, 204)


if __name__ == "__main__":
    unittest.main()
