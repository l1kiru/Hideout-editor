# Application settings via Pydantic Settings.

from __future__ import annotations

from pathlib import Path
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="allow"
    )

    api_title: str = "Hideout Editor API"
    api_version: str = "1.1.2"
    debug: bool = False

    @field_validator("debug", mode="before")
    @classmethod
    def normalize_debug_mode(cls, value: Any) -> Any:
        if not isinstance(value, str):
            return value
        normalized = value.strip().casefold()
        if normalized in {"release", "prod", "production"}:
            return False
        if normalized in {"dev", "development", "debug"}:
            return True
        return value

    # Local dev default: whitelist bundled Vite origins instead of "*".
    # Override via env if the backend must be reachable from other hosts.
    cors_allow_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )
    cors_allow_credentials: bool = False
    cors_allow_methods: list[str] = Field(default_factory=lambda: ["*"])
    cors_allow_headers: list[str] = Field(default_factory=lambda: ["*"])

    max_upload_size_bytes: int = 30 * 1024 * 1024  # 30 MB

    hideout_maps_sqlite: Path = Path("hideout_settings/hideout_maps.sqlite")
    hideout_template_cache_dir: Path = Path("hideout_settings/template_cache")
    hideout_map_dir: Path = Path("hideout_map")
    hideout_scenes_dir: Path = Path("hideout_scenes")
    input_images_dir: Path = Path("input/images")

    max_editor_scene_json_bytes: int = 12 * 1024 * 1024

    scene_storage_key: str = "hideout_scene"
    active_map_id_ls: str = "active_map_id"

    rot_full: int = 65536
    rot_line_rope_offset: int = 32768
    rot_step: int = 2048

    max_undo_steps: int = 96

    line_brush_vertex_dist: float = 1.0

    rope_spacing_world: float = 3.0
    rope_margin_from_wall_world: float = 3.0

    # Populated from an external catalog when the app wires it in.
    asset_catalog: dict[str, Any] = Field(default_factory=dict)


settings = AppSettings()
