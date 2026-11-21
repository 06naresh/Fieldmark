"""Canonical request identity and opaque synchronization cursors."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
from typing import Any

from app.core.config import settings
from app.core.exceptions import BadRequestError

CURSOR_PREFIX = "fm1"


def canonical_request_hash(values: dict[str, Any]) -> str:
    """Return a stable SHA-256 identity for a synchronization operation."""

    canonical = json.dumps(
        values,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
        default=str,
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def encode_cursor(position: int) -> str:
    """Encode a change-feed position as an opaque, signed string."""

    body = json.dumps(
        {"position": position}, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    signature = hmac.new(
        settings.SECRET_KEY.encode("utf-8"), body, hashlib.sha256
    ).hexdigest()[:32]
    token = base64.urlsafe_b64encode(body + b"." + signature.encode("ascii")).decode("ascii")
    return f"{CURSOR_PREFIX}.{token.rstrip('=')}"


def decode_cursor(cursor: str | None) -> int:
    """Decode a client cursor, returning zero for the initial cursor."""

    if cursor is None:
        return 0
    try:
        prefix, token = cursor.split(".", 1)
        if prefix != CURSOR_PREFIX:
            raise ValueError("Unknown cursor prefix.")
        padded = token + "=" * (-len(token) % 4)
        raw = base64.urlsafe_b64decode(padded.encode("ascii"))
        body, signature = raw.rsplit(b".", 1)
        expected = hmac.new(
            settings.SECRET_KEY.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()[:32].encode("ascii")
        if not hmac.compare_digest(signature, expected):
            raise ValueError("Invalid cursor signature.")
        data = json.loads(body)
        position = data["position"]
        if not isinstance(position, int) or isinstance(position, bool) or position < 0:
            raise ValueError("Invalid cursor position.")
        return position
    except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        raise BadRequestError("The synchronization cursor is invalid.") from exc
