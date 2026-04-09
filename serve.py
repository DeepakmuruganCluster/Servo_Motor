#!/usr/bin/env python3
"""
Titan Servo Tool — Local Dev Server
Run:  python serve.py
Then open:  http://localhost:8080
"""
import http.server
import socketserver
import webbrowser
import os

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

import json

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        print(f"  {self.address_string()} → {format % args}")

    def do_POST(self):
        if self.path == '/save-project':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                state_file = os.path.join(DIRECTORY, 'project_state.json')
                
                # Load current state if it exists
                current_state = {}
                if os.path.exists(state_file):
                    with open(state_file, 'r') as f:
                        try: current_state = json.load(f)
                        except: pass

                # Determine update type
                if 'axisUpdate' in data:
                    upd = data['axisUpdate']
                    name = upd.get('name')
                    if 'projectResults' in current_state and name:
                        # Find and update specific axis in the list
                        found = False
                        for i, res in enumerate(current_state['projectResults']):
                            if res.get('name') == name:
                                current_state['projectResults'][i] = upd
                                found = True
                                break
                        if not found:
                            current_state['projectResults'].append(upd)
                    else:
                        # Fallback: if projectResults doesn't exist yet
                        current_state['projectResults'] = [upd]
                    
                    # Also update global selectorState for convenience
                    current_state['selectorState'] = data.get('selectorState', upd.get('selectorState'))
                else:
                    # Global update (from Project Calculator)
                    if 'projectResults' in data: current_state['projectResults'] = data['projectResults']
                    if 'selectorState' in data: current_state['selectorState'] = data['selectorState']
                
                current_state['lastUpdated'] = data.get('lastUpdated', '')

                # Write back
                with open(state_file, 'w') as f:
                    json.dump(current_state, f, indent=2)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok'}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    # Check if project_state.json exists, if not create empty
    state_path = os.path.join(DIRECTORY, 'project_state.json')
    if not os.path.exists(state_path):
        with open(state_path, 'w') as f:
            json.dump({}, f)

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}"
        print()
        print("╔══════════════════════════════════════════════╗")
        print("║     TITAN Servo Tool — Local Server          ║")
        print("╠══════════════════════════════════════════════╣")
        print(f"║  Serving at: {url:<32}║")
        print("║                                              ║")
        print("║  Launcher:   /index.html                     ║")
        print("║  Calculator: /titan-project-calculator.html  ║")
        print("║  Selector:   /titan-servo-selector.html      ║")
        print("║  Persistence: /project_state.json            ║")
        print("║                                              ║")
        print("║  Press Ctrl+C to stop                        ║")
        print("╚══════════════════════════════════════════════╝")
        print()
        webbrowser.open(url + '/login.html')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Server stopped.")
