#!/usr/bin/env python3
"""
OpenLingo Linux Desktop Launcher
Serves the bundled offline OpenLingo web app locally and opens a dedicated
desktop app window (Chromium/Chrome/Brave/Edge --app mode with persistent profile,
or graceful system browser fallback).
"""

import functools
import http.server
import os
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

APP_ID = "org.openlingo.app"
BASE_DIR = Path(__file__).resolve().parent
WWW_DIR = BASE_DIR / "www"
if not WWW_DIR.exists():
    # Support running directly from repo root linux/ folder during development
    WWW_DIR = BASE_DIR.parent

DATA_DIR = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share")) / "openlingo"
PROFILE_DIR = DATA_DIR / "profile"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def pick_port(preferred=8080):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        if s.connect_ex(("127.0.0.1", preferred)) != 0:
            return preferred
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def find_app_browser():
    for candidate in (
        "chromium",
        "chromium-browser",
        "google-chrome",
        "google-chrome-stable",
        "brave-browser",
        "brave",
        "microsoft-edge",
        "vivaldi",
    ):
        path = shutil.which(candidate)
        if path:
            return path
    return None


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    port = pick_port(8080)
    handler = functools.partial(QuietHandler, directory=str(WWW_DIR))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)

    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()

    url = f"http://localhost:{port}/"
    browser = find_app_browser()

    def shutdown(*_args):
        httpd.shutdown()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    if browser:
        PROFILE_DIR.mkdir(parents=True, exist_ok=True)
        cmd = [
            browser,
            f"--app={url}",
            f"--class={APP_ID}",
            f"--user-data-dir={PROFILE_DIR}",
            "--window-size=1120,760",
            "--no-first-run",
            "--no-default-browser-check",
        ]
        try:
            proc = subprocess.Popen(cmd)
            proc.wait()
        finally:
            httpd.shutdown()
    else:
        print(f"OpenLingo running at {url} (press Ctrl+C to quit)")
        webbrowser.open(url)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            httpd.shutdown()


if __name__ == "__main__":
    main()
