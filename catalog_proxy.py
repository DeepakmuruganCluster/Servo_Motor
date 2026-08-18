#!/usr/bin/env python3
"""Server-side proxy that logs into admin.clustervise.com's Django admin and scrapes
component data, so the browser never sees Django credentials or talks cross-origin.

Credentials come ONLY from the DJANGO_ADMIN_USER / DJANGO_ADMIN_PASS environment
variables (set in the systemd unit on the server, never committed to this repo).
Without them, get_components() returns [] and callers fall back to local data.

A background thread refreshes all four categories on a timer (CACHE_TTL_SECONDS) so
request handling never blocks on a live Django scrape — the admin's changelist view
doesn't expose the `parameters` field, so each item needs its own detail-page fetch,
which is too slow (seconds, for the larger categories) to do inline per HTTP request.
"""
import html
import json
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import http.cookiejar

ADMIN_BASE = "https://admin.clustervise.com"
ADMIN_USER = os.environ.get("DJANGO_ADMIN_USER", "")
ADMIN_PASS = os.environ.get("DJANGO_ADMIN_PASS", "")

# SubComponent category name -> its id on admin.clustervise.com (components app).
SUBCOMPONENT_IDS = {
    "Ball Screw": 9,
    "Servo Drive": 10,
    "Gearbox": 21,
    "Servo Motor": 12,
}

CACHE_TTL_SECONDS = 300
REQUEST_TIMEOUT = 10

_cache = {}  # name -> list[dict]
_cache_lock = threading.Lock()

_jar = http.cookiejar.CookieJar()
_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(_jar))
_logged_in = False
_login_lock = threading.Lock()


def _get(path):
    req = urllib.request.Request(ADMIN_BASE + path, headers={"User-Agent": "servo-catalog-proxy"})
    return _opener.open(req, timeout=REQUEST_TIMEOUT).read().decode()


def _csrf(html_text):
    m = re.search(r'csrfmiddlewaretoken" value="([^"]+)"', html_text)
    return m.group(1) if m else None


def _ensure_login():
    global _logged_in
    with _login_lock:
        if _logged_in:
            return
        if not ADMIN_USER or not ADMIN_PASS:
            raise RuntimeError("DJANGO_ADMIN_USER / DJANGO_ADMIN_PASS not set")
        login_page = _get("/admin/login/?next=/admin/")
        token = _csrf(login_page)
        data = urllib.parse.urlencode({
            "csrfmiddlewaretoken": token,
            "username": ADMIN_USER,
            "password": ADMIN_PASS,
            "next": "/admin/",
        }).encode()
        req = urllib.request.Request(
            ADMIN_BASE + "/admin/login/?next=/admin/",
            data=data,
            headers={
                "User-Agent": "servo-catalog-proxy",
                "Referer": ADMIN_BASE + "/admin/login/?next=/admin/",
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        body = _opener.open(req, timeout=REQUEST_TIMEOUT).read().decode()
        if "Please enter the correct" in body:
            raise RuntimeError("Django admin login failed — check DJANGO_ADMIN_USER/PASS")
        _logged_in = True


def _fetch_item_ids(sub_component_id):
    html_text = _get(f"/admin/components/subcomponentitem/?sub_component__id__exact={sub_component_id}")
    ids = re.findall(r"subcomponentitem/(\d+)/change/", html_text)
    return sorted(set(int(i) for i in ids))


def _fetch_item_detail(item_id):
    html_text = _get(f"/admin/components/subcomponentitem/{item_id}/change/")

    model_number_m = re.search(r'name="model_number" value="([^"]*)"', html_text)
    series_m = re.search(r'name="series" value="([^"]*)"', html_text)
    manufacturer_m = re.search(
        r'name="manufacturer"[^>]*>.*?<option value="\d+" selected>([^<]*)</option>', html_text, re.S
    )
    params_m = re.search(r'name="parameters"[^>]*>(.*?)</textarea>', html_text, re.S)

    parameters = {}
    if params_m:
        try:
            parameters = json.loads(html.unescape(params_m.group(1)).strip() or "{}")
        except ValueError:
            parameters = {}

    return {
        "model_number": model_number_m.group(1) if model_number_m else None,
        "series": series_m.group(1) if series_m else "",
        "manufacturer": manufacturer_m.group(1).strip() if manufacturer_m else "",
        "parameters": _coerce_parameters(parameters),
    }


_INT_RE = re.compile(r"-?\d+")


def _coerce_value(v):
    # admin.clustervise.com's CSV importer stores every value as a string (e.g. "60", "False"),
    # while items created directly via its add-form keep real JSON types. selection.js math needs
    # real numbers/booleans either way, so normalize here rather than trusting the source.
    if not isinstance(v, str):
        return v
    if v == "":
        return None
    if v == "True":
        return True
    if v == "False":
        return False
    if _INT_RE.fullmatch(v):
        return int(v)
    try:
        return float(v)
    except ValueError:
        return v


def _coerce_parameters(params):
    return {k: (v if isinstance(v, list) else _coerce_value(v)) for k, v in params.items()}


def _scrape_subcomponent(name):
    sub_id = SUBCOMPONENT_IDS.get(name)
    if sub_id is None:
        return []
    _ensure_login()
    items = []
    for item_id in _fetch_item_ids(sub_id):
        try:
            items.append(_fetch_item_detail(item_id))
        except (urllib.error.URLError, ValueError):
            continue  # skip a bad row rather than fail the whole category
    return items


def _refresh_all():
    for name in SUBCOMPONENT_IDS:
        try:
            items = _scrape_subcomponent(name)
            with _cache_lock:
                _cache[name] = items
            print(f"[catalog-proxy] refreshed {name}: {len(items)} items")
        except Exception as e:
            print(f"[catalog-proxy] refresh failed for {name}: {e}")


def _refresh_loop():
    while True:
        _refresh_all()
        time.sleep(CACHE_TTL_SECONDS)


def start_background_refresh():
    if not ADMIN_USER or not ADMIN_PASS:
        print("[catalog-proxy] DJANGO_ADMIN_USER/PASS not set — API will serve empty results, "
              "frontend falls back to local catalogs")
        return
    t = threading.Thread(target=_refresh_loop, daemon=True)
    t.start()


def get_components(sub_component_name):
    with _cache_lock:
        return _cache.get(sub_component_name, [])
