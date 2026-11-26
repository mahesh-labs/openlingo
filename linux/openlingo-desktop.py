#!/usr/bin/env python3
"""
OpenLingo Linux Desktop Launcher
Serves the bundled offline OpenLingo web app locally and opens a dedicated
desktop app window (Chromium/Chrome/Brave/Edge --app mode with persistent profile,
or graceful system browser fallback).

Includes a local loopback OAuth handoff (`/__desktop/auth/*`) so Sign in with Google
opens in the user's system default browser (reusing their existing Google session)
and delivers the OAuth token seamlessly back into the desktop app window.
"""

import functools
import http.server
import json
import os
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
import urllib.parse
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

AUTH_LOCK = threading.Lock()
AUTH_SESSIONS = {}
SERVER_PORT = 8080
USING_APP_WINDOW = False


def open_system_browser(url):
    xdg = shutil.which("xdg-open")
    if xdg:
        try:
            subprocess.Popen(
                [xdg, url],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
            return
        except Exception:
            pass
    webbrowser.open(url)


def render_desktop_auth_page(state_nonce, client_id):
    js_state = json.dumps(state_nonce)
    js_client_id = json.dumps(client_id)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in to OpenLingo</title>
  <link rel="icon" type="image/svg+xml" href="/assets/icons/openlingo-icon.svg" />
  <style>
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: radial-gradient(circle at top, #13213c 0%, #0b1120 60%);
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }}
    .card {{
      width: 100%;
      max-width: 420px;
      background: #111827;
      border: 1px solid #263248;
      border-radius: 20px;
      padding: 28px 24px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0,0,0,0.45);
    }}
    .logo {{
      width: 64px;
      height: 64px;
      border-radius: 16px;
      margin: 0 auto 14px;
      display: block;
      box-shadow: 0 8px 20px rgba(16,185,129,0.28);
    }}
    h1 {{ margin: 0; font-size: 22px; font-weight: 800; }}
    p {{ margin: 8px 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5; }}
    .gbtn {{
      margin-top: 20px;
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 13px 18px;
      border-radius: 12px;
      border: none;
      background: #ffffff;
      color: #111827;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    }}
    .gbtn:hover {{ background: #f1f5f9; }}
    .gbtn:disabled {{ opacity: 0.65; cursor: wait; }}
    .status {{
      margin-top: 16px;
      padding: 11px 14px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      display: none;
    }}
    .status.ok {{
      display: block;
      background: rgba(16,185,129,0.14);
      border: 1px solid rgba(16,185,129,0.45);
      color: #34d399;
    }}
    .status.err {{
      display: block;
      background: rgba(244,63,94,0.14);
      border: 1px solid rgba(244,63,94,0.45);
      color: #fb7185;
    }}
  </style>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
</head>
<body>
  <div class="card">
    <img class="logo" src="/assets/icons/openlingo-icon.svg" alt="OpenLingo" />
    <h1>Sign in to OpenLingo Desktop</h1>
    <p>Using your default browser so you can continue with your existing Google account without logging in again.</p>
    <button id="signin-btn" class="gbtn" type="button">
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      <span>Continue with Google</span>
    </button>
    <div id="status" class="status"></div>
  </div>
  <script>
    const STATE = {js_state};
    const CLIENT_ID = {js_client_id};
    const SCOPE = 'https://www.googleapis.com/auth/drive.appdata openid email profile';
    const btn = document.getElementById('signin-btn');
    const statusEl = document.getElementById('status');
    let completed = false;
    let tokenClient = null;

    function showStatus(msg, ok) {{
      statusEl.textContent = msg;
      statusEl.className = 'status ' + (ok ? 'ok' : 'err');
    }}

    async function sendResult(payload) {{
      await fetch('/__desktop/auth/complete', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ state: STATE, ...payload }})
      }});
    }}

    function ensureClient() {{
      if (tokenClient) return tokenClient;
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {{
        return null;
      }}
      tokenClient = window.google.accounts.oauth2.initTokenClient({{
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: async (resp) => {{
          if (resp.error) {{
            btn.disabled = false;
            showStatus('Sign-in failed: ' + (resp.error_description || resp.error), false);
            await sendResult({{ error: resp.error_description || resp.error }});
            return;
          }}
          completed = true;
          btn.style.display = 'none';
          showStatus('✅ Signed in! You can close this tab and return to OpenLingo.', true);
          await sendResult({{
            access_token: resp.access_token,
            expires_in: Number(resp.expires_in || 3500)
          }});
          setTimeout(() => {{ try {{ window.close(); }} catch (e) {{}} }}, 1200);
        }},
        error_callback: async (err) => {{
          btn.disabled = false;
          const msg = (err && err.message) || 'Popup blocked or closed. Click Continue with Google to retry.';
          showStatus(msg, false);
        }}
      }});
      return tokenClient;
    }}

    btn.addEventListener('click', () => {{
      const tc = ensureClient();
      if (!tc) {{
        showStatus('Google Sign-In is still loading — please click again in a moment.', false);
        return;
      }}
      btn.disabled = true;
      statusEl.className = 'status';
      tc.requestAccessToken({{ prompt: 'select_account' }});
    }});

    window.addEventListener('pagehide', () => {{
      if (!completed && navigator.sendBeacon) {{
        navigator.sendBeacon(
          '/__desktop/auth/cancel',
          new Blob([JSON.stringify({{ state: STATE }})], {{ type: 'application/json' }})
        );
      }}
    }});
  </script>
</body>
</html>
"""


class ReusableHTTPServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = True


class DesktopHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _send_json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > 65536:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/__desktop/info":
            self._send_json(200, {"desktop": USING_APP_WINDOW, "port": SERVER_PORT})
            return

        if parsed.path == "/__desktop/auth":
            qs = urllib.parse.parse_qs(parsed.query)
            state_nonce = (qs.get("state") or [""])[0]
            client_id = (qs.get("client_id") or [""])[0]
            with AUTH_LOCK:
                valid = state_nonce in AUTH_SESSIONS
            if not valid or not client_id:
                self.send_error(400, "Invalid or expired sign-in session")
                return
            html_bytes = render_desktop_auth_page(state_nonce, client_id).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(html_bytes)))
            self.end_headers()
            self.wfile.write(html_bytes)
            return

        if parsed.path == "/__desktop/auth/poll":
            qs = urllib.parse.parse_qs(parsed.query)
            state_nonce = (qs.get("state") or [""])[0]
            with AUTH_LOCK:
                sess = AUTH_SESSIONS.get(state_nonce)
                if not sess:
                    self._send_json(404, {"status": "expired"})
                    return
                status = sess["status"]
                if status in ("done", "error", "cancelled"):
                    result = dict(sess)
                    AUTH_SESSIONS.pop(state_nonce, None)
                    self._send_json(200, result)
                    return
            self._send_json(200, {"status": "pending"})
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/__desktop/auth/start":
            data = self._read_json()
            client_id = str(data.get("clientId") or "").strip()
            if not client_id:
                self._send_json(400, {"error": "Missing clientId"})
                return
            state_nonce = secrets.token_urlsafe(24)
            now = time.time()
            with AUTH_LOCK:
                # Prune stale sessions older than 5 minutes
                stale = [k for k, v in AUTH_SESSIONS.items() if now - v.get("created", 0) > 300]
                for k in stale:
                    AUTH_SESSIONS.pop(k, None)
                AUTH_SESSIONS[state_nonce] = {"status": "pending", "created": now}
            auth_url = (
                f"http://localhost:{SERVER_PORT}/__desktop/auth"
                f"?state={urllib.parse.quote(state_nonce)}&client_id={urllib.parse.quote(client_id)}"
            )
            open_system_browser(auth_url)
            self._send_json(200, {"state": state_nonce, "authUrl": auth_url})
            return

        if parsed.path == "/__desktop/auth/complete":
            data = self._read_json()
            state_nonce = str(data.get("state") or "")
            with AUTH_LOCK:
                sess = AUTH_SESSIONS.get(state_nonce)
                if sess:
                    if data.get("access_token"):
                        sess["status"] = "done"
                        sess["access_token"] = str(data["access_token"])
                        sess["expires_in"] = int(data.get("expires_in") or 3500)
                    else:
                        sess["status"] = "error"
                        sess["error"] = str(data.get("error") or "Google Sign-In failed.")
            self._send_json(200, {"ok": True})
            return

        if parsed.path == "/__desktop/auth/cancel":
            data = self._read_json()
            state_nonce = str(data.get("state") or "")
            with AUTH_LOCK:
                sess = AUTH_SESSIONS.get(state_nonce)
                if sess and sess["status"] == "pending":
                    sess["status"] = "cancelled"
                    sess["error"] = "Default browser sign-in tab was closed."
            self._send_json(200, {"ok": True})
            return

        self.send_error(404, "Not Found")


def pick_port(preferred_ports=(8080, 18420, 18421)):
    env_port = os.environ.get("OPENLINGO_PORT")
    candidates = [int(env_port)] if (env_port and env_port.isdigit()) else list(preferred_ports)
    for port in candidates:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
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
    global SERVER_PORT, USING_APP_WINDOW
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    port = pick_port()
    SERVER_PORT = port
    browser = find_app_browser()
    USING_APP_WINDOW = bool(browser)

    handler = functools.partial(DesktopHandler, directory=str(WWW_DIR))
    httpd = ReusableHTTPServer(("127.0.0.1", port), handler)

    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()

    url = f"http://localhost:{port}/"

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
        open_system_browser(url)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            httpd.shutdown()


if __name__ == "__main__":
    main()
