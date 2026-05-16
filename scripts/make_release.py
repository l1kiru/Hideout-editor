#!/usr/bin/env python3
# Creates a clean source release archive for Hideout Editor.

from __future__ import annotations

import argparse
import fnmatch
import zipfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "release"

# Soft ceiling on the release archive size. The current archive is about
# 9.4 MB; a 50 MB cap leaves ~5x headroom for legitimate growth while
# still catching common regressions such as an accidentally included
# frontend/dist or node_modules (the latter alone is ~200 MB).
MAX_RELEASE_BYTES = 50_000_000

INCLUDE_PATHS = (
    "backend",
    "docs",
    "frontend",
    "hideout_core",
    "shared",
    "scripts",
    "tests",
    "input/hideout",
    ".gitignore",
    "LICENSE",
    "package-lock.json",
    "package.json",
    "README.md",
    "README.ru.md",
    "requirements-api.txt",
    "dev.py",
    "Start.bat",
    "UpdateAndStart.bat",
)

# Runtime and repo-tooling paths that must be present in every release archive.
REQUIRED_RELEASE_PATHS = (
    "shared/catalog/editorAssets.json",
    "shared/contracts/scene/editorSceneContract.json",
    "scripts/make_release.py",
    "scripts/generate_editor_shared_artifacts.py",
    "backend/main.py",
    "dev.py",
)

# Patterns that re-include files which would otherwise match EXCLUDE_PATTERNS.
# Order: include path -> exclude check -> override check.
INCLUDE_OVERRIDE_PATTERNS = (
    "input/hideout/*",
)

EXCLUDE_PATTERNS = (
    ".git/*",
    ".venv/*",
    ".pytest_cache/*",
    "__pycache__/*",
    "*/__pycache__/*",
    "*.pyc",
    "node_modules/*",
    "frontend/node_modules/*",
    "frontend/dist/*",
    "dist/*",
    "release/*",
    "releases/*",
    "hideout_settings/*",
    "*/hideout_settings/*",
    "hideout_scenes/*",
    "*/hideout_scenes/*",
    "input/*",
    "*/input/*",
    "output/*",
    "*/output/*",
    "temp/*",
    "tmp/*",
    "logs/*",
    "*/logs/*",
    "*.generated.csv",
    "*.log",
)


def _is_excluded(rel: str) -> bool:
    normalized = rel.replace("\\", "/")
    if any(fnmatch.fnmatch(normalized, pat) for pat in INCLUDE_OVERRIDE_PATTERNS):
        return False
    return any(fnmatch.fnmatch(normalized, pat) for pat in EXCLUDE_PATTERNS)


def _iter_release_files() -> list[Path]:
    files: list[Path] = []
    for include in INCLUDE_PATHS:
        path = PROJECT_ROOT / include
        if not path.exists():
            continue
        if path.is_file():
            rel = path.relative_to(PROJECT_ROOT).as_posix()
            if not _is_excluded(rel):
                files.append(path)
            continue
        for child in path.rglob("*"):
            if not child.is_file():
                continue
            rel = child.relative_to(PROJECT_ROOT).as_posix()
            if _is_excluded(rel):
                continue
            files.append(child)
    return sorted(files, key=lambda p: p.relative_to(PROJECT_ROOT).as_posix().casefold())


def _format_bytes(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.2f} MB ({n:,} bytes)"
    if n >= 1_000:
        return f"{n / 1_000:.1f} KB ({n:,} bytes)"
    return f"{n} bytes"


def _assert_required_release_files(files: list[Path]) -> None:
    rel_paths = {path.relative_to(PROJECT_ROOT).as_posix() for path in files}
    missing = [rel for rel in REQUIRED_RELEASE_PATHS if rel not in rel_paths]
    if missing:
        raise SystemExit(
            "release archive is missing required paths:\n"
            + "\n".join(f"  - {rel}" for rel in missing)
            + "\nUpdate INCLUDE_PATHS in scripts/make_release.py."
        )


def build_archive(output: Path, *, max_bytes: int = MAX_RELEASE_BYTES) -> Path:
    output.parent.mkdir(parents=True, exist_ok=True)
    files = _iter_release_files()
    _assert_required_release_files(files)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in files:
            zf.write(path, path.relative_to(PROJECT_ROOT).as_posix())
    size = output.stat().st_size
    if size > max_bytes:
        raise SystemExit(
            f"release archive {output.name} is {size:,} bytes, exceeds cap of "
            f"{max_bytes:,} bytes; check INCLUDE_PATHS for accidental bloat "
            f"(e.g. frontend/dist, node_modules)"
        )
    return output


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a clean Hideout Editor release zip.")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_DIR / "hideout-editor-release.zip",
        help="Output zip path.",
    )
    parser.add_argument(
        "--max-bytes",
        type=int,
        default=MAX_RELEASE_BYTES,
        help=(
            "Fail if the resulting archive is larger than this many bytes. "
            f"Default: {MAX_RELEASE_BYTES:,}."
        ),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    archive = build_archive(args.output, max_bytes=args.max_bytes)
    print(f"Created {archive} ({_format_bytes(archive.stat().st_size)})")


if __name__ == "__main__":
    main()
