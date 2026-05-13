#!/usr/bin/env python3
# Bootstrap and run the Hideout Editor local environment on a freshly
# cloned repository: validates Python / Node.js / npm, creates a Python
# virtual environment in .venv when missing, installs backend deps from
# requirements-api.txt and frontend deps (npm ci or npm install), starts
# the FastAPI backend (uvicorn) and the Vite frontend, waits for the
# backend to respond before launching the frontend, mirrors backend and
# frontend output into logs/last_run.log, and opens the app in the
# default browser once the frontend is up. The log directory is size
# capped (LOG_TOTAL_BYTES_CAP); on overflow the active file is rotated
# to last_run.log.1 and the previous backup is overwritten.
#
# Usage:
#   python dev.py                bootstrap if needed, then start both servers
#   python dev.py --skip-install do not run pip/npm install (fast repeat run)
#   python dev.py --reinstall    remove .venv and frontend/node_modules first
#   python dev.py --dev          enable uvicorn --reload (developer mode)
#   python dev.py --no-browser   do not auto-open the app in the browser
#
# Environment variables:
#   HIDEOUT_EDITOR_BACKEND_HOST  default 127.0.0.1
#   HIDEOUT_EDITOR_BACKEND_PORT  default 8000
#   HIDEOUT_EDITOR_FRONTEND_PORT default 5173

from __future__ import annotations

import argparse
import atexit
import os
import shutil
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import venv
import webbrowser
from pathlib import Path

IS_WINDOWS = sys.platform == "win32"

PROJECT_ROOT = Path(__file__).resolve().parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"
VENV_DIR = PROJECT_ROOT / ".venv"
REQUIREMENTS_FILE = PROJECT_ROOT / "requirements-api.txt"
LOG_DIR = PROJECT_ROOT / "logs"
LOG_FILE = LOG_DIR / "last_run.log"


def _env_port(name: str, fallback: int) -> int:
    raw = os.environ.get(name)
    if not raw:
        return fallback
    try:
        value = int(raw)
    except ValueError:
        return fallback
    if not (0 < value < 65536):
        return fallback
    return value


BACKEND_HOST = os.environ.get("HIDEOUT_EDITOR_BACKEND_HOST", "127.0.0.1")
BACKEND_PORT = _env_port("HIDEOUT_EDITOR_BACKEND_PORT", 8000)
FRONTEND_PORT = _env_port("HIDEOUT_EDITOR_FRONTEND_PORT", 5173)

BACKEND_HEALTH_URL = (
    f"http://{BACKEND_HOST}:{BACKEND_PORT}/api/openapi.json"
)
FRONTEND_URL = f"http://localhost:{FRONTEND_PORT}"

MIN_PYTHON = (3, 10)
BACKEND_HEALTH_TIMEOUT_S = 30.0
FRONTEND_READY_TIMEOUT_S = 30.0

# Hard cap on total log size on disk: <= 50 MiB. The budget is split
# between the active file (logs/last_run.log) and one rolled backup
# (logs/last_run.log.1). When the active file reaches LOG_MAX_BYTES it
# is renamed to .1 (overwriting the previous backup) and logging
# continues into a fresh last_run.log.
LOG_TOTAL_BYTES_CAP = 50 * 1024 * 1024
LOG_BACKUP_COUNT = 1
LOG_MAX_BYTES = LOG_TOTAL_BYTES_CAP // (1 + LOG_BACKUP_COUNT)

child_processes: list[subprocess.Popen] = []
log_threads: list[threading.Thread] = []
_log_lock = threading.Lock()
_log_handle = None
_log_size_bytes = 0


# Opens a fresh log file. Must be called while holding _log_lock.
def _open_log_file_locked() -> None:
    global _log_handle, _log_size_bytes
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    _log_handle = LOG_FILE.open("w", encoding="utf-8", errors="replace")
    _log_size_bytes = 0


def _open_log_file():
    with _log_lock:
        _open_log_file_locked()
    return _log_handle


def _close_log_file() -> None:
    global _log_handle, _log_size_bytes
    with _log_lock:
        if _log_handle is not None:
            try:
                _log_handle.flush()
                _log_handle.close()
            finally:
                _log_handle = None
                _log_size_bytes = 0


# Closes the current log, renames it to .1, and opens a fresh file.
# Must be called while holding _log_lock.
def _rotate_log_file_locked() -> None:
    global _log_handle, _log_size_bytes
    if _log_handle is None:
        return
    try:
        _log_handle.flush()
    except Exception:
        pass
    try:
        _log_handle.close()
    except Exception:
        pass
    _log_handle = None
    _log_size_bytes = 0

    if LOG_BACKUP_COUNT > 0:
        backup = LOG_FILE.with_name(LOG_FILE.name + ".1")
        try:
            if backup.exists():
                backup.unlink()
        except Exception:
            pass
        try:
            LOG_FILE.replace(backup)
        except Exception:
            try:
                LOG_FILE.unlink(missing_ok=True)
            except Exception:
                pass
    else:
        try:
            LOG_FILE.unlink(missing_ok=True)
        except Exception:
            pass

    try:
        _open_log_file_locked()
    except Exception:
        _log_handle = None
        _log_size_bytes = 0


def _write_log_line(line: str) -> None:
    global _log_size_bytes
    if _log_handle is None:
        return
    payload = line if line.endswith("\n") else line + "\n"
    try:
        encoded_len = len(payload.encode("utf-8", errors="replace"))
    except Exception:
        encoded_len = len(payload)
    with _log_lock:
        if _log_handle is None:
            return
        try:
            if _log_size_bytes + encoded_len > LOG_MAX_BYTES:
                _rotate_log_file_locked()
                if _log_handle is None:
                    return
                notice = (
                    f"[dev] log rotated due to size cap "
                    f"({LOG_MAX_BYTES // (1024 * 1024)} MiB per file, "
                    f"{LOG_TOTAL_BYTES_CAP // (1024 * 1024)} MiB total); "
                    f"previous slice moved to {LOG_FILE.name}.1\n"
                )
                try:
                    _log_handle.write(notice)
                    _log_size_bytes += len(
                        notice.encode("utf-8", errors="replace")
                    )
                except Exception:
                    pass
            _log_handle.write(payload)
            _log_handle.flush()
            _log_size_bytes += encoded_len
        except Exception:
            pass


def info(msg: str) -> None:
    line = f"[dev] {msg}"
    print(line, flush=True)
    _write_log_line(line)


def warn(msg: str) -> None:
    line = f"[dev][warn] {msg}"
    print(line, flush=True, file=sys.stderr)
    _write_log_line(line)


def fatal(msg: str, code: int = 1) -> None:
    line = f"[dev][error] {msg}"
    print(line, flush=True, file=sys.stderr)
    _write_log_line(line)
    sys.exit(code)


# Reads a stream line by line and mirrors it into both stdout and the log file.
def _pump_stream(stream, label: str, sink) -> None:
    try:
        for raw in iter(stream.readline, b""):
            if not raw:
                break
            try:
                text = raw.decode("utf-8", errors="replace")
            except Exception:
                text = repr(raw)
            text = text.rstrip("\r\n")
            line = f"[{label}] {text}"
            try:
                sink.write(line + "\n")
                sink.flush()
            except Exception:
                pass
            _write_log_line(line)
    except Exception:
        pass
    finally:
        try:
            stream.close()
        except Exception:
            pass


def _attach_log_pump(proc: subprocess.Popen, label: str) -> None:
    if proc.stdout is not None:
        t = threading.Thread(
            target=_pump_stream,
            args=(proc.stdout, label, sys.stdout),
            daemon=True,
            name=f"log-pump-{label}-stdout",
        )
        t.start()
        log_threads.append(t)
    if proc.stderr is not None:
        t = threading.Thread(
            target=_pump_stream,
            args=(proc.stderr, label, sys.stderr),
            daemon=True,
            name=f"log-pump-{label}-stderr",
        )
        t.start()
        log_threads.append(t)


def _kill_proc(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return
    try:
        if IS_WINDOWS:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                check=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        else:
            proc.terminate()
        try:
            proc.wait(timeout=4)
        except subprocess.TimeoutExpired:
            proc.kill()
    except (ProcessLookupError, OSError):
        pass


def cleanup() -> None:
    for proc in child_processes:
        _kill_proc(proc)
    _close_log_file()


def install_signal_handlers() -> None:
    def handler(_sig, _frame):
        info("shutting down servers...")
        cleanup()
        sys.exit(0)

    signal.signal(signal.SIGINT, handler)
    signal.signal(signal.SIGTERM, handler)
    atexit.register(cleanup)


def assert_python_version() -> None:
    if sys.version_info < MIN_PYTHON:
        fatal(
            f"Python {MIN_PYTHON[0]}.{MIN_PYTHON[1]}+ is required, "
            f"found {sys.version_info.major}.{sys.version_info.minor}."
        )


def _try_capture(cmd: list[str]) -> str | None:
    try:
        res = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            shell=IS_WINDOWS,
        )
        return res.stdout.strip()
    except (subprocess.CalledProcessError, OSError):
        return None


def assert_node_toolchain() -> None:
    if not shutil.which("node") or not shutil.which("npm"):
        fatal(
            "Node.js / npm not found in PATH. "
            "Install Node.js 22 LTS or newer from https://nodejs.org/ "
            "and reopen the terminal."
        )
    node_ver = _try_capture(["node", "--version"]) or "?"
    npm_ver = _try_capture(["npm", "--version"]) or "?"
    info(f"node {node_ver}, npm {npm_ver}")


def venv_python(venv_path: Path) -> Path:
    if IS_WINDOWS:
        return venv_path / "Scripts" / "python.exe"
    return venv_path / "bin" / "python"


def ensure_venv(*, reinstall: bool) -> Path:
    if reinstall and VENV_DIR.exists():
        info(f"removing existing virtualenv at {VENV_DIR}")
        shutil.rmtree(VENV_DIR)

    py = venv_python(VENV_DIR)
    if not py.exists():
        info(f"creating Python virtualenv in {VENV_DIR}")
        builder = venv.EnvBuilder(with_pip=True, clear=False, upgrade_deps=False)
        builder.create(str(VENV_DIR))

    if not py.exists():
        fatal(f"venv python missing after creation: {py}")
    return py


def install_python_deps(py: Path) -> None:
    info(f"installing backend dependencies into {VENV_DIR.name}/")
    subprocess.run(
        [str(py), "-m", "pip", "install", "--upgrade", "pip"],
        check=True,
    )
    subprocess.run(
        [str(py), "-m", "pip", "install", "-r", str(REQUIREMENTS_FILE)],
        check=True,
    )


def install_frontend_deps(*, reinstall: bool) -> None:
    node_modules = FRONTEND_DIR / "node_modules"
    if reinstall and node_modules.exists():
        info("removing frontend/node_modules")
        shutil.rmtree(node_modules)
    if node_modules.exists():
        info("frontend/node_modules already present — skipping install")
        return

    lock = FRONTEND_DIR / "package-lock.json"
    cmd = ["npm", "ci"] if lock.exists() else ["npm", "install"]
    info(f"installing frontend dependencies ({' '.join(cmd)})")
    res = subprocess.run(cmd, cwd=str(FRONTEND_DIR), shell=IS_WINDOWS)
    if res.returncode != 0:
        fatal(
            "frontend dependency install failed. "
            "Remove frontend/node_modules and rerun with --reinstall."
        )


def _child_env() -> dict[str, str]:
    env = os.environ.copy()
    env.setdefault("HIDEOUT_EDITOR_BACKEND_HOST", BACKEND_HOST)
    env.setdefault("HIDEOUT_EDITOR_BACKEND_PORT", str(BACKEND_PORT))
    env.setdefault("HIDEOUT_EDITOR_FRONTEND_PORT", str(FRONTEND_PORT))
    return env


def _child_creationflags() -> int:
    if IS_WINDOWS:
        return subprocess.CREATE_NEW_PROCESS_GROUP
    return 0


def start_backend(py: Path, *, dev_mode: bool) -> subprocess.Popen:
    info(
        f"starting backend on http://{BACKEND_HOST}:{BACKEND_PORT}"
        + (" (reload)" if dev_mode else "")
    )
    cmd: list[str] = [
        str(py),
        "-m",
        "uvicorn",
        "backend.main:app",
        "--host",
        BACKEND_HOST,
        "--port",
        str(BACKEND_PORT),
    ]
    if dev_mode:
        cmd.append("--reload")
    proc = subprocess.Popen(
        cmd,
        cwd=str(PROJECT_ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=0,
        env=_child_env(),
        creationflags=_child_creationflags(),
    )
    child_processes.append(proc)
    _attach_log_pump(proc, "backend")
    return proc


def wait_for_backend(proc: subprocess.Popen, timeout_s: float) -> bool:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        if proc.poll() is not None:
            return False
        try:
            with urllib.request.urlopen(BACKEND_HEALTH_URL, timeout=1.0) as resp:
                if 200 <= resp.status < 500:
                    return True
        except (urllib.error.URLError, ConnectionError, TimeoutError, OSError):
            pass
        time.sleep(0.5)
    return False


def start_frontend() -> subprocess.Popen:
    info(f"starting frontend on {FRONTEND_URL}")
    proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=str(FRONTEND_DIR),
        shell=IS_WINDOWS,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=0,
        env=_child_env(),
        creationflags=_child_creationflags(),
    )
    child_processes.append(proc)
    _attach_log_pump(proc, "frontend")
    return proc


def wait_for_frontend(proc: subprocess.Popen, timeout_s: float) -> bool:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        if proc.poll() is not None:
            return False
        try:
            with urllib.request.urlopen(FRONTEND_URL, timeout=1.0) as resp:
                if 200 <= resp.status < 500:
                    return True
        except (urllib.error.URLError, ConnectionError, TimeoutError, OSError):
            pass
        time.sleep(0.5)
    return False


def open_browser_safely(url: str) -> None:
    try:
        webbrowser.open(url, new=2, autoraise=True)
    except Exception as exc:
        warn(f"could not open browser automatically: {exc!r}")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Start Hideout Editor local environment.",
    )
    p.add_argument(
        "--skip-install",
        action="store_true",
        help="Do not run pip/npm install steps.",
    )
    p.add_argument(
        "--reinstall",
        action="store_true",
        help="Remove .venv and frontend/node_modules before installing.",
    )
    p.add_argument(
        "--dev",
        action="store_true",
        help="Developer mode: run uvicorn with --reload.",
    )
    p.add_argument(
        "--no-browser",
        action="store_true",
        help="Do not auto-open the app in the default browser.",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()
    _open_log_file()
    info("Hideout Editor — local startup")
    info(f"log file: {LOG_FILE}")
    install_signal_handlers()

    assert_python_version()
    assert_node_toolchain()

    py = ensure_venv(reinstall=args.reinstall)

    if args.skip_install:
        info("skipping dependency install (--skip-install)")
    else:
        install_python_deps(py)
        install_frontend_deps(reinstall=args.reinstall)

    backend = start_backend(py, dev_mode=args.dev)
    if not wait_for_backend(backend, BACKEND_HEALTH_TIMEOUT_S):
        if backend.poll() is not None:
            fatal(f"backend exited early with code {backend.returncode}")
        warn(
            f"backend did not respond on {BACKEND_HEALTH_URL} within "
            f"{int(BACKEND_HEALTH_TIMEOUT_S)}s — starting frontend anyway"
        )

    frontend = start_frontend()

    info("everything is up:")
    info(f"  backend : http://{BACKEND_HOST}:{BACKEND_PORT}")
    info(f"  frontend: {FRONTEND_URL}")
    info(f"  API docs: http://{BACKEND_HOST}:{BACKEND_PORT}/api/docs")
    info("press Ctrl+C to stop both servers.")

    if not args.no_browser:
        if wait_for_frontend(frontend, FRONTEND_READY_TIMEOUT_S):
            open_browser_safely(FRONTEND_URL)
        else:
            warn(
                "frontend did not become ready in time — skipping browser auto-open"
            )

    try:
        while any(p.poll() is None for p in child_processes):
            time.sleep(0.5)
        info("one or more servers stopped unexpectedly.")
    except KeyboardInterrupt:
        info("shutting down servers...")
    finally:
        cleanup()


if __name__ == "__main__":
    main()
