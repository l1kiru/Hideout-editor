# Updating

## Git Install

If you cloned the repository:

```bash
git pull
python dev.py
```

If the update changes dependencies, or if startup fails after an update:

```bash
python dev.py --reinstall
```

This recreates `.venv` and `frontend/node_modules`. It does not intentionally delete local runtime data.

## Release Archive Install

If you use a downloaded release archive:

1. Download the new release archive.
2. Extract it into a new folder.
3. Copy your local runtime data if needed, especially `hideout_settings/`.
4. Start the new folder with `python dev.py`.

## Runtime Data

Local data is expected to live in these paths:

- `hideout_settings/`
- `hideout_scenes/`
- `input/`

Do not delete these folders unless you want to reset local state.
