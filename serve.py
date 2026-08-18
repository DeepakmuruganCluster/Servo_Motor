#!/usr/bin/env python3
import http.server, json, os, socketserver
from urllib.parse import urlparse, parse_qs

import catalog_proxy

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/components/':
            self._handle_api_components(parsed)
            return
        super().do_GET()

    def _handle_api_components(self, parsed):
        sub_component = parse_qs(parsed.query).get('sub_component', [None])[0]
        if not sub_component:
            self._json_response(400, {'error': 'sub_component query param required'})
            return
        items = catalog_proxy.get_components(sub_component)
        self._json_response(200, items)

    def _json_response(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

PORT = int(os.environ.get('PORT', 8080))

catalog_proxy.start_background_refresh()

class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True

with ThreadingHTTPServer(('', PORT), NoCacheHandler) as httpd:
    print(f'Serving on http://localhost:{PORT} with no-cache headers')
    httpd.serve_forever()
