# Updating

## Git Install

If you cloned the repository:

```bash
git pull
python dev.py
```

If your machine only has `python3`, run `python3 dev.py` after `git pull`.

If the update changes dependencies, or if startup fails after an update:

```bash
python dev.py --reinstall
```

This recreates `.venv` and `frontend/node_modules`. It does not intentionally delete local runtime data.

## Release Archive Install

If you use a downloaded release archive:

1. Download the new release archive.
2. Extract it into a new folder.
3. Copy your local runtime data if needed:
   - `hideout_settings/`
   - `hideout_scenes/`
   - `input/images/`
4. Start the new folder with `python dev.py` (or `python3 dev.py` if your system
   does not provide `python`).

## Runtime Data

Local data is expected to live in these paths:

- `hideout_settings/`
- `hideout_scenes/`
- `input/images/`
- `logs/`

Do not delete these folders unless you want to reset local state.
The `input/hideout/` folder is different: it contains bundled sample `.hideout`
maps that ship with the project and can be replaced by a newer release archive.
