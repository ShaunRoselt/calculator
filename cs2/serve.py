"""Serve this checkout's web calculator on loopback for development."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ADDON = Path(__file__).resolve().parents[1]
PUBLIC_FILES = {
    "app.html", "index.html", "manifest.json", "package.json", "pIqaD-qolqoS.ttf",
    "service-worker.js", "themes.html", "updates.html",
}
PUBLIC_FOLDERS = {"assets", "scripts", "styles"}
APP_PATH = "/app.html?page=standard"
PORT = 4173


class CalculatorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ADDON, **kwargs)

    def send_head(self):
        if urlsplit(self.path).path == "/":
            self.send_response(302)
            self.send_header("Location", APP_PATH)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None
        target = Path(self.translate_path(self.path)).resolve()
        if target.is_relative_to(ADDON) and target.is_file():
            relative = target.relative_to(ADDON)
            if relative.as_posix() in PUBLIC_FILES or relative.parts[0] in PUBLIC_FOLDERS:
                return super().send_head()
        self.send_error(404)
        return None

    def log_request(self, code="-", size="-"):
        if str(code).startswith(("4", "5")):
            super().log_request(code, size)


def main():
    with ThreadingHTTPServer(("127.0.0.1", PORT), CalculatorHandler) as server:
        print(f"http://127.0.0.1:{PORT}{APP_PATH}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
