#!/usr/bin/env python3
import http.server, socketserver

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

with socketserver.TCPServer(('', 8787), NoCacheHandler) as httpd:
    print('Serving on http://localhost:8787 with no-cache headers')
    httpd.serve_forever()
