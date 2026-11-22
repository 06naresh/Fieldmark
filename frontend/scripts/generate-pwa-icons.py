"""Generate deterministic PNG icons for the Fieldmark PWA.

Uses only the Python standard library so icon generation remains reproducible
without adding a frontend dependency.
"""

from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path
from typing import Iterable, Sequence

TEAL = (15, 118, 110, 255)
DARK_TEAL = (8, 76, 71, 255)
WHITE = (255, 255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)


def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def blend(destination: Sequence[int], source: Sequence[int], opacity: float = 1.0) -> tuple[int, int, int, int]:
    alpha = clamp(source[3] / 255.0 * opacity)
    result = []
    for index in range(3):
        value = source[index] * alpha + destination[index] * (1.0 - alpha)
        result.append(round(value))
    result_alpha = 255 * alpha + destination[3] * (1.0 - alpha)
    result.append(round(result_alpha))
    return result[0], result[1], result[2], result[3]


def set_pixel(pixels: bytearray, size: int, x: int, y: int, color: Sequence[int], opacity: float = 1.0) -> None:
    if x < 0 or y < 0 or x >= size or y >= size:
        return
    offset = (y * size + x) * 4
    current = pixels[offset : offset + 4]
    pixels[offset : offset + 4] = bytes(blend(current, color, opacity))


def inside_rounded_rect(
    px: float,
    py: float,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    radius: float,
) -> bool:
    nearest_x = min(max(px, x0 + radius), x1 - radius)
    nearest_y = min(max(py, y0 + radius), y1 - radius)
    dx = px - nearest_x
    dy = py - nearest_y
    return dx * dx + dy * dy <= radius * radius


def fill_rounded_rect(
    pixels: bytearray,
    size: int,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    radius: float,
    color: Sequence[int],
) -> None:
    min_x = max(0, math.floor(x0 - 1))
    max_x = min(size - 1, math.ceil(x1 + 1))
    min_y = max(0, math.floor(y0 - 1))
    max_y = min(size - 1, math.ceil(y1 + 1))
    for y in range(min_y, max_y + 1):
        for x in range(min_x, max_x + 1):
            if inside_rounded_rect(x + 0.5, y + 0.5, x0, y0, x1, y1, radius):
                set_pixel(pixels, size, x, y, color)


def distance_to_segment(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    dx = bx - ax
    dy = by - ay
    length_squared = dx * dx + dy * dy
    if length_squared == 0:
        return math.hypot(px - ax, py - ay)
    t = clamp(((px - ax) * dx + (py - ay) * dy) / length_squared)
    nearest_x = ax + t * dx
    nearest_y = ay + t * dy
    return math.hypot(px - nearest_x, py - nearest_y)


def draw_check(
    pixels: bytearray,
    size: int,
    color: Sequence[int],
    points: Iterable[tuple[float, float]],
    thickness: float,
) -> None:
    segments = list(zip(points, list(points)[1:]))
    for y in range(size):
        for x in range(size):
            px = x + 0.5
            py = y + 0.5
            distance = min(distance_to_segment(px, py, a[0], a[1], b[0], b[1]) for a, b in segments)
            opacity = clamp(thickness - distance + 0.5)
            if opacity > 0:
                set_pixel(pixels, size, x, y, color, opacity)


def write_png(path: Path, size: int, pixels: bytearray) -> None:
    raw_rows = bytearray()
    for y in range(size):
        raw_rows.append(0)
        raw_rows.extend(pixels[y * size * 4 : (y + 1) * size * 4])

    def chunk(chunk_type: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + chunk_type
            + data
            + struct.pack(">I", zlib.crc32(chunk_type + data) & 0xFFFFFFFF)
        )

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw_rows, 9)) + chunk(b"IEND", b"")
    path.write_bytes(png)


def make_regular_icon(size: int) -> bytearray:
    pixels = bytearray(TRANSPARENT * size * size)
    fill_rounded_rect(pixels, size, 0, 0, size, size, size * 0.22, TEAL)
    fill_rounded_rect(pixels, size, size * 0.275, size * 0.235, size * 0.725, size * 0.815, size * 0.045, DARK_TEAL)
    fill_rounded_rect(pixels, size, size * 0.29, size * 0.25, size * 0.71, size * 0.80, size * 0.035, WHITE)
    fill_rounded_rect(pixels, size, size * 0.43, size * 0.18, size * 0.57, size * 0.29, size * 0.018, DARK_TEAL)
    draw_check(
        pixels,
        size,
        DARK_TEAL,
        ((size * 0.36, size * 0.53), (size * 0.45, size * 0.63), (size * 0.66, size * 0.40)),
        size * 0.031,
    )
    return pixels


def make_maskable_icon(size: int) -> bytearray:
    pixels = bytearray(TEAL * size * size)
    draw_check(
        pixels,
        size,
        WHITE,
        ((size * 0.30, size * 0.50), (size * 0.43, size * 0.64), (size * 0.70, size * 0.35)),
        size * 0.045,
    )
    return pixels


def main() -> None:
    output_dir = Path(__file__).resolve().parents[1] / "public" / "icons"
    output_dir.mkdir(parents=True, exist_ok=True)

    write_png(output_dir / "icon-192.png", 192, make_regular_icon(192))
    write_png(output_dir / "icon-512.png", 512, make_regular_icon(512))
    write_png(output_dir / "icon-maskable-512.png", 512, make_maskable_icon(512))


if __name__ == "__main__":
    main()
