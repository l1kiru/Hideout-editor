# Troubleshooting

## Python Is Not Found

Install Python 3.10 or newer and reopen your terminal. On macOS/Linux, try `python3 dev.py` if `python dev.py` points to Python 2 or is missing.

## Node.js or npm Is Not Found

Install Node.js 20.19 or newer from https://nodejs.org/ and reopen your terminal.

## Dependency Install Fails

Try a clean dependency reinstall:

```bash
python dev.py --reinstall
```

If npm install fails, remove `frontend/node_modules/` and run the command again.

## Backend Port Is Already In Use

The backend uses port `8000` by default. Either stop the process using that port
and restart the app, or pick another port via env variable:

```bash
HIDEOUT_EDITOR_BACKEND_PORT=8010 python dev.py
```

On Windows PowerShell:

```powershell
$env:HIDEOUT_EDITOR_BACKEND_PORT="8010"; python dev.py
```

## Frontend Port Is Already In Use

The frontend uses port `5173` by default. Override with
`HIDEOUT_EDITOR_FRONTEND_PORT`:

```bash
HIDEOUT_EDITOR_FRONTEND_PORT=5174 python dev.py
```

## Where Are Startup Logs

Backend and frontend output from the last `python dev.py` run is mirrored into
`logs/last_run.log`. Attach this file when reporting an issue.

The log directory is capped at **50 MiB total**, split between the active
`logs/last_run.log` and one rolled backup. Each file is allowed up to
**25 MiB** (50 MiB / 2). When the active file reaches that per-file limit, it
is rotated to `logs/last_run.log.1` (overwriting the previous backup) and
logging continues in a fresh `last_run.log`. If you need to keep an older
copy, save it before running `python dev.py` again.

## Catalog Data Is Missing

The backend seeds its object catalog from `backend/seed_data/poe2_objects_database_all.csv`. Keep this file in release archives and source checkouts. If it is missing, the backend can attempt to regenerate it during database bootstrap, but the bundled CSV is the fastest and most reliable startup path.

## Full Reset

To reset dependencies only:

```bash
python dev.py --reinstall
```

To reset local app data as well, stop the app and remove `hideout_settings/`. This deletes local database state.
