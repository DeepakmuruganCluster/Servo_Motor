#!/usr/bin/env python3
"""Parses nginx's existing access log to show who visited app.clustervise.com/servo/ and
whether they arrived via a Google search referrer — no custom logging needed, nginx already
records every request (IP, referrer, timestamp, user-agent) in the standard combined format.

Geolocation is resolved on demand here (not live per-request), so it never adds latency or a
third-party dependency to actual page loads.

Run this ON THE SERVER, where the nginx log actually lives:
    python3 scripts/analyze_nginx_log.py
    python3 scripts/analyze_nginx_log.py --google-only
    python3 scripts/analyze_nginx_log.py --log-path /var/log/nginx/access.log
"""
import argparse
import json
import re
import sys
import urllib.request

# Standard nginx "combined" log format:
# $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
LOG_LINE_RE = re.compile(
    r'(?P<ip>\S+) \S+ \S+ \[(?P<time>[^\]]+)\] '
    r'"(?P<method>\S+) (?P<path>\S+) \S+" (?P<status>\d+) \d+ '
    r'"(?P<referrer>[^"]*)" "(?P<user_agent>[^"]*)"'
)

GOOGLE_HOST_RE = re.compile(r'://([^/]*\.)?google\.[a-z.]+(/|$)')

_geo_cache = {}


def geolocate(ip):
    if ip in _geo_cache:
        return _geo_cache[ip]
    if ip in ('127.0.0.1', '::1') or ip.startswith('192.168.') or ip.startswith('10.'):
        result = 'local/private IP'
    else:
        try:
            with urllib.request.urlopen(f'http://ip-api.com/json/{ip}?fields=city,regionName,country', timeout=5) as r:
                data = json.load(r)
            result = ', '.join(p for p in (data.get('city'), data.get('regionName'), data.get('country')) if p) or 'unknown'
        except Exception as e:
            result = f'lookup failed ({e})'
    _geo_cache[ip] = result
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--log-path', default='/var/log/nginx/access.log')
    ap.add_argument('--google-only', action='store_true')
    ap.add_argument('--path-prefix', default='/servo/', help='only show requests under this path')
    args = ap.parse_args()

    try:
        f = open(args.log_path)
    except FileNotFoundError:
        print(f"Log file not found: {args.log_path}", file=sys.stderr)
        print("Check the real path with: sudo nginx -T | grep access_log", file=sys.stderr)
        sys.exit(1)

    with f:
        for line in f:
            m = LOG_LINE_RE.match(line)
            if not m:
                continue
            path = m.group('path')
            if args.path_prefix and not path.startswith(args.path_prefix):
                continue
            # skip asset requests, same spirit as only logging page loads
            if re.search(r'\.(js|css|png|jpg|svg|ico|woff2?|map)$', path):
                continue
            referrer = m.group('referrer')
            via_google = bool(GOOGLE_HOST_RE.search(referrer))
            if args.google_only and not via_google:
                continue
            ip = m.group('ip')
            location = geolocate(ip)
            tag = ' [via Google search]' if via_google else ''
            print(f"{m.group('time')}  {ip:<15}  {location:<30}  {path}{tag}")
            if referrer and referrer != '-':
                print(f"    referrer: {referrer}")


if __name__ == '__main__':
    main()
