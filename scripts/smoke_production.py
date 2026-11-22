"""Run non-destructive smoke checks against a deployed Fieldmark build."""

from __future__ import annotations

import argparse
import json
import os
import sys
from http.client import HTTPMessage
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

API_PREFIX = "/api/v1"


class SmokeFailure(RuntimeError):
    """Raised when a production smoke check fails."""


def fetch(
    base_url: str,
    path: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    payload: dict[str, Any] | None = None,
    timeout: float = 15.0,
) -> tuple[int, HTTPMessage, str]:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request_headers = dict(headers or {})
    if payload is not None:
        request_headers["Content-Type"] = "application/json"
    request = Request(f"{base_url}{path}", data=body, headers=request_headers, method=method)

    try:
        with urlopen(request, timeout=timeout) as response:  # noqa: S310 - URL is operator supplied
            return response.status, response.headers, response.read().decode("utf-8", "replace")
    except HTTPError as exc:
        return exc.code, exc.headers, exc.read().decode("utf-8", "replace")


def expect_status(label: str, actual: int, expected: int) -> None:
    if actual != expected:
        raise SmokeFailure(f"{label}: expected HTTP {expected}, received {actual}")


def expect_json_object(label: str, body: str) -> dict[str, Any]:
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError as exc:
        raise SmokeFailure(f"{label}: response was not valid JSON") from exc
    if not isinstance(parsed, dict):
        raise SmokeFailure(f"{label}: response was not a JSON object")
    return parsed


def check_public_endpoints(base_url: str, *, is_https: bool) -> list[str]:
    passed: list[str] = []

    status, _, body = fetch(base_url, "/health")
    expect_status("API health", status, 200)
    if expect_json_object("API health", body).get("status") != "healthy":
        raise SmokeFailure("API health: unexpected status payload")
    passed.append("API health")

    status, _, body = fetch(base_url, "/health/ready")
    expect_status("Database readiness", status, 200)
    readiness = expect_json_object("Database readiness", body)
    if readiness.get("database") != "connected":
        raise SmokeFailure("Database readiness: database is not connected")
    passed.append("Database readiness")

    status, _, body = fetch(base_url, "/manifest.webmanifest")
    expect_status("PWA manifest", status, 200)
    manifest = expect_json_object("PWA manifest", body)
    if "name" not in manifest:
        raise SmokeFailure("PWA manifest: missing application name")
    passed.append("PWA manifest")

    status, headers, _ = fetch(base_url, "/sw.js")
    expect_status("Service worker", status, 200)
    cache_control = headers.get("Cache-Control", "")
    if "must-revalidate" not in cache_control.lower():
        raise SmokeFailure("Service worker: missing revalidation cache policy")
    passed.append("Service worker")

    status, _, body = fetch(base_url, "/asset-manifest.json")
    expect_status("Asset manifest", status, 200)
    assets = expect_json_object("Asset manifest", body).get("assets")
    if not isinstance(assets, list) or not assets:
        raise SmokeFailure("Asset manifest: no production assets listed")
    status, _, _ = fetch(base_url, str(assets[0]))
    expect_status("Hashed production asset", status, 200)
    passed.append("Production assets")

    status, _, body = fetch(base_url, "/login")
    expect_status("SPA fallback", status, 200)
    if 'id="root"' not in body:
        raise SmokeFailure("SPA fallback: application root element was not returned")
    passed.append("SPA fallback")

    status, _, _ = fetch(base_url, f"{API_PREFIX}/inspections")
    expect_status("Protected API", status, 401)
    passed.append("Protected API")

    if is_https:
        status, headers, _ = fetch(base_url, "/health")
        if "max-age=" not in headers.get("Strict-Transport-Security", ""):
            raise SmokeFailure("HTTPS: missing HSTS header")
        passed.append("HTTPS security headers")

        status, _, _ = fetch(base_url, f"{API_PREFIX}/docs")
        expect_status("Production API docs disabled", status, 404)
        passed.append("Production API docs disabled")

    return passed


def check_authenticated_session(base_url: str, email: str, password: str, *, is_https: bool) -> list[str]:
    status, headers, body = fetch(
        base_url,
        f"{API_PREFIX}/auth/login",
        method="POST",
        payload={"email": email, "password": password},
    )
    expect_status("Administrator login", status, 200)
    login = expect_json_object("Administrator login", body).get("data", {})
    access_token = login.get("access_token")
    if not isinstance(access_token, str) or not access_token:
        raise SmokeFailure("Administrator login: no access token returned")

    set_cookies = headers.get_all("Set-Cookie") or []
    refresh_cookie = next(
        (cookie for cookie in set_cookies if "fieldmark_refresh=" in cookie),
        None,
    )
    csrf_cookie = next(
        (cookie for cookie in set_cookies if "fieldmark_csrf=" in cookie),
        None,
    )
    if refresh_cookie is None or "HttpOnly" not in refresh_cookie:
        raise SmokeFailure("Administrator login: refresh cookie is not HttpOnly")
    if csrf_cookie is None:
        raise SmokeFailure("Administrator login: CSRF cookie was not set")
    if is_https and "Secure" not in refresh_cookie:
        raise SmokeFailure("Administrator login: secure refresh cookie was not set")

    status, _, body = fetch(
        base_url,
        f"{API_PREFIX}/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    expect_status("Authenticated session", status, 200)
    current_user = expect_json_object("Authenticated session", body).get("data", {})
    if current_user.get("email") != email:
        raise SmokeFailure("Authenticated session: unexpected account returned")

    return ["Secure administrator login", "Authenticated session"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", help="Deployment origin, for example https://fieldmark.example.com")
    parser.add_argument("--allow-http", action="store_true", help="Allow http:// for local checks")
    parser.add_argument(
        "--email",
        help="Optional administrator email (or set SMOKE_ADMIN_EMAIL)",
    )
    parser.add_argument(
        "--password",
        help="Administrator password (or set SMOKE_ADMIN_PASSWORD)",
    )
    args = parser.parse_args()

    base_url = args.url.rstrip("/")
    is_https = base_url.startswith("https://")
    email = args.email or os.environ.get("SMOKE_ADMIN_EMAIL")
    password = args.password or os.environ.get("SMOKE_ADMIN_PASSWORD")

    if not is_https and not (args.allow_http and base_url.startswith("http://localhost")):
        print("Refusing to smoke-test a non-HTTPS origin unless --allow-http localhost is used.")
        return 2
    if bool(email) != bool(password):
        print("Supply both administrator credentials via flags or SMOKE_ADMIN_* variables.")
        return 2

    try:
        passed = check_public_endpoints(base_url, is_https=is_https)
        if email and password:
            passed.extend(
                check_authenticated_session(
                    base_url,
                    email,
                    password,
                    is_https=is_https,
                )
            )
    except (SmokeFailure, URLError, TimeoutError) as exc:
        print(f"SMOKE FAILED: {exc}")
        return 1

    print(f"SMOKE PASSED ({len(passed)} checks): {', '.join(passed)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
