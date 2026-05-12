# Installation

This project is intended to run locally from the repository or from a release archive.

## Requirements

- Python 3.10+
- Node.js 22 LTS or newer
- npm 10 or newer (ships with Node.js 22)

## Windows

1. Install Python from https://www.python.org/ and make sure `python` is available in PowerShell.
2. Install Node.js LTS from https://nodejs.org/ and reopen the terminal.
3. Download or clone the project.
4. From the project root, either double-click `Start.bat` or run:

```powershell
python dev.py
```

Use `UpdateAndStart.bat` to fetch the latest changes with `git pull` and start the app in one step.

Open http://localhost:5173 after the script reports that both servers are running.

## macOS and Linux

1. Install Python 3.10+ with your system package manager or from https://www.python.org/.
2. Install Node.js 22 LTS or newer from https://nodejs.org/ or with your system package manager.
3. Download or clone the project.
4. From the project root, run:

```bash
python3 dev.py
```

If your system maps Python 3 to `python`, `python dev.py` is also fine.

## Configuration

`python dev.py` reads these environment variables (defaults shown):

- `HIDEOUT_EDITOR_BACKEND_HOST` — default `127.0.0.1`
- `HIDEOUT_EDITOR_BACKEND_PORT` — default `8000`
- `HIDEOUT_EDITOR_FRONTEND_PORT` — default `5173`

### Startup Flags

`python dev.py` accepts the following command-line flags:

- `--skip-install` — do not run `pip` / `npm install`. Use this for the
  fastest repeat run when nothing in `requirements-api.txt` or
  `frontend/package.json` has changed.

    ```bash
    python dev.py --skip-install
    ```

- `--reinstall` — remove the existing `.venv` and `frontend/node_modules`
  before installing again. Use after a dependency change or when startup
  fails because of a corrupted install.

    ```bash
    python dev.py --reinstall
    ```

- `--dev` — start the backend with `uvicorn --reload` so changes to backend
  Python sources restart the server automatically. Use only for development
  on the backend.

    ```bash
    python dev.py --dev
    ```

- `--no-browser` — do not auto-open the app in the default browser. Useful
  when running the script from CI, over SSH, or alongside an already-open
  browser tab.

    ```bash
    python dev.py --no-browser
    ```

Flags can be combined, e.g. `python dev.py --skip-install --no-browser`.

### Logs

Backend and frontend output from the last run is mirrored to
`logs/last_run.log`. The log directory is size-capped and rotates
automatically — see [TROUBLESHOOTING.md](TROUBLESHOOTING.md#where-are-startup-logs)
for details.

## Manual Startup

The bootstrap script is the supported path, but you can run the services manually:

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-api.txt
npm --prefix frontend install
.venv/Scripts/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
npm --prefix frontend run dev
```

Add `--reload` to the uvicorn command if you want auto-reload on backend file
changes. On macOS/Linux, use `.venv/bin/python` instead of
`.venv/Scripts/python`.
